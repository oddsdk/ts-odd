type LockQueueFn = () => void

export default class Mutex {

  locked = false
  lockQueue: LockQueueFn[] = []
  
  async lock(): Promise<void> {
    if(!this.locked) {
      this.locked = true
      return
    }else {
      return new Promise((resolve) => {
        this.lockQueue.push(() => {
          this.locked = true
          resolve()
        })
      })
    }
  }

  async unlock(): Promise<void> {
    this.locked = false
    const [fn, ...rest] = this.lockQueue
    this.lockQueue = rest
    if(fn){
      fn()
    }
  }
}

