import { impl } from "./implementation.js"

export const register = async (options: { username: string; email?: string }): Promise<{ success: boolean }> => {
  return impl.register(options)
}

export const isUsernameValid = async (username: string): Promise<boolean> => {
  return impl.isUsernameValid(username)
}

export const isUsernameAvailable = async (username: string): Promise<boolean> => {
  return impl.isUsernameAvailable(username)
}

export { AccountLinkingProducer, createProducer } from "./linking/producer.js"
export { AccountLinkingConsumer, createConsumer } from "./linking/consumer.js"