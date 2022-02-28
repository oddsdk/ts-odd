import { impl } from "./implementation.js"

const {  isUsernameAvailable, isUsernameValid, register } = impl

export { isUsernameAvailable, isUsernameValid, register }
export { AccountLinkingRequestor, createConsumer as createRequestor } from "./linking/consumer.js"
export { AccountLinkingProvider, createProducer as createProvider } from "./linking/producer.js"