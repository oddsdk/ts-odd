export function endpoint(host: string) {
  return ({ rootDID }: { rootDID: string }): string => {
    return `${host}/user/link/${rootDID}`
  }
}