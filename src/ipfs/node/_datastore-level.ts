import type { AbstractLevel } from "abstract-level"

import { BaseDatastore, Errors } from "datastore-core"
import { Batch, Datastore, Key, Pair, Query, KeyQuery, Options } from "interface-datastore"
import filter from "it-filter"
import map from "it-map"
import take from "it-take"
import sort from "it-sort"
import { BrowserLevel, DatabaseOptions, Iterator, IteratorOptions, OpenOptions } from "browser-level"

export type ConstructorOptions = DatabaseOptions<string, Uint8Array>
export type Level = BrowserLevel
export type LevelDb = AbstractLevel<any, string, Uint8Array>
export type LevelIterator = {
  end: (cb: (err: Error) => void) => void,
  next: (cb: (err: Error, key: string | Uint8Array | null, value: any) => void) => void
}


/**
 * A datastore backed by leveldb
 */
export class LevelDatastore extends BaseDatastore {

  db: LevelDb
  opts: OpenOptions

  constructor(path: string | LevelDb, opts: ConstructorOptions = {}) {
    super()

    this.db = typeof path === 'string'
      ? new BrowserLevel(path, {
        ...opts,
        keyEncoding: 'utf8',
        valueEncoding: 'view'
      })
      : path

    this.opts = {
      createIfMissing: true,
      ...opts
    }
  }

  async open(): Promise<void> {
    try {
      await this.db.open(this.opts)
    } catch (err: any) {
      throw Errors.dbOpenFailedError(err)
    }
  }

  async put(key: Key, value: Uint8Array): Promise<void> {
    try {
      await this.db.put(key.toString(), value)
    } catch (err: any) {
      throw Errors.dbWriteFailedError(err)
    }
  }

  async get(key: Key): Promise<Uint8Array> {
    let data
    try {
      data = await this.db.get(key.toString())
    } catch (err: any) {
      if (err.notFound) throw Errors.notFoundError(err)
      throw Errors.dbWriteFailedError(err)
    }
    return data
  }

  async has(key: Key): Promise<boolean> {
    try {
      await this.db.get(key.toString())
    } catch (err: any) {
      if (err.notFound) return false
      throw err
    }
    return true
  }

  async delete(key: Key): Promise<void> {
    try {
      await this.db.del(key.toString())
    } catch (err: any) {
      throw Errors.dbDeleteFailedError(err)
    }
  }

  close() {
    return this.db && this.db.close()
  }

  batch(): Batch {
    const ops: Array<{ type: 'put', key: string, value: Uint8Array; } | { type: 'del', key: string }> = []
    return {
      put: (key, value) => {
        ops.push({
          type: 'put',
          key: key.toString(),
          value: value
        })
      },
      delete: (key) => {
        ops.push({
          type: 'del',
          key: key.toString()
        })
      },
      commit: () => {
        return this.db.batch(ops)
      }
    }
  }

  query(q: Query) {
    let it = this._query({
      values: true,
      prefix: q.prefix
    })

    if (Array.isArray(q.filters)) {
      it = q.filters.reduce((it, f) => filter(it, f), it)
    }

    if (Array.isArray(q.orders)) {
      it = q.orders.reduce((it, f) => sort(it, f), it)
    }

    const { offset, limit } = q
    if (offset) {
      let i = 0
      it = filter(it, () => i++ >= offset)
    }

    if (limit) {
      it = take(it, limit)
    }

    return it
  }

  queryKeys(q: KeyQuery) {
    let it = map(this._query({
      values: false,
      prefix: q.prefix
    }), ({ key }) => key)

    if (Array.isArray(q.filters)) {
      it = q.filters.reduce((it, f) => filter(it, f), it)
    }

    if (Array.isArray(q.orders)) {
      it = q.orders.reduce((it, f) => sort(it, f), it)
    }

    const { offset, limit } = q
    if (offset) {
      let i = 0
      it = filter(it, () => i++ >= offset)
    }

    if (limit) {
      it = take(it, limit)
    }

    return it
  }

  _query(opts: { values: boolean, prefix?: string }): AsyncIterable<Pair> {
    const iteratorOpts: IteratorOptions<string, Uint8Array> = {
      keys: true,
      keyEncoding: 'buffer',
      values: opts.values
    }

    // Let the db do the prefix matching
    if (opts.prefix != null) {
      const prefix = opts.prefix.toString()
      // Match keys greater than or equal to `prefix` and
      iteratorOpts.gte = prefix
      // less than `prefix` + \xFF (hex escape sequence)
      iteratorOpts.lt = prefix + '\xFF'
    }

    const iterator = this.db.iterator(iteratorOpts)

    if (iterator[ Symbol.asyncIterator ]) {
      return levelIteratorToIterator(iterator)
    }

    // @ts-expect-error support older level
    if (iterator.next != null && iterator.end != null) {
      // @ts-expect-error support older level
      return oldLevelIteratorToIterator(iterator)
    }

    throw new Error('Level returned incompatible iterator')
  }
}

async function* levelIteratorToIterator(li: Iterator<LevelDb, string, Uint8Array>): AsyncIterable<Pair> {
  for await (const [ key, value ] of li) {
    yield { key: new Key(key, false), value }
  }

  await li.close()
}

function oldLevelIteratorToIterator(li: LevelIterator): AsyncIterable<Pair> {
  return {
    [ Symbol.asyncIterator ]() {
      return {
        next: () => new Promise((resolve, reject) => {
          li.next((err, key, value) => {
            if (err) return reject(err)
            if (key == null) {
              return li.end(err => {
                if (err) return reject(err)
                resolve({ done: true, value: undefined })
              })
            }
            resolve({ done: false, value: { key: new Key(key, false), value } })
          })
        }),
        return: () => new Promise((resolve, reject) => {
          li.end(err => {
            if (err) return reject(err)
            resolve({ done: true, value: undefined })
          })
        })
      }
    }
  }
}