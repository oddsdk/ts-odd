import { impl } from "./implementation.js"

const {  isUsernameAvailable, isUsernameValid, register } = impl

export { isUsernameAvailable, isUsernameValid, register }
export { createConsumer as createRequestor } from "./linking/consumer.js"
export { createProducer as createProvider } from "./linking/producer.js"