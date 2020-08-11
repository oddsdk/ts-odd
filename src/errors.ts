export class NoPermissionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "NoPermissionError"
  }
}
