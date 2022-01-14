import * as consumer from "./consumer.js"
import * as producer from "./producer.js"

type LinkingRole = "CONSUMER" | "PRODUCER"

let role: LinkingRole

export const setLinkingRole = (linkingRole: LinkingRole): void => {
  role = linkingRole 
}

export const handleMessage = async (event: MessageEvent): Promise<any> => {
  const { data } = event
  const message = new TextDecoder().decode(data.arrayBuffer ? await data.arrayBuffer() : data)
  console.debug("message (raw)", message)

  switch (role) {
    case "CONSUMER":
      await consumer.handleMessage(message)
      break
    case "PRODUCER":
      await producer.handleMessage(message)
      break
  }
}
