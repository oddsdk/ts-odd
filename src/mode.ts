// 🧩


export type Mode = "authority" | "delegate"



// 🛠️


export function isMode(str: string): str is Mode {
  return str === "authority" || str === "delegate"
}