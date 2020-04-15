// These bytes in the "data" field of an IPFS node indicate that the node is an IPLD DAG Node
export const DAG_NODE_DATA = Buffer.from([8, 1])

export default {
  DAG_NODE_DATA
}
