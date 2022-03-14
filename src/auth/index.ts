import { impl } from "./implementation.js"

export const register = async (options: { username: string; email: string }): Promise<{ success: boolean }> => {
  return impl.register(options)
}

export const isUsernameValid = async (username: string): Promise<boolean> => {
  return impl.isUsernameValid(username)
}

export const isUsernameAvailable = async (username: string): Promise<boolean> => {
  return impl.isUsernameAvailable(username)
}

export { AccountLinkingRequestor, createConsumer as createRequestor } from "./linking/consumer.js"
export { AccountLinkingProvider, createProducer as createProvider } from "./linking/producer.js"