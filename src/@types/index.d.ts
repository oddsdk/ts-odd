declare module 'base58-universal' {
    export function encode(input: Uint8Array, maxline?: number): string
    export function decode(input: string): Uint8Array
}
declare module 'ipld-dag-pb'
declare module 'borc'
