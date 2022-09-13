export function endpoint(host: string) {
  return ({ rootDID }: { rootDID: string }): string => {
    return `${endpoint}/user/link/${rootDID}`
  }
}