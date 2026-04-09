import { definePluginEntry } from "./api.js"
import { registerBridgePlugin } from "./src/register.js"

export default definePluginEntry({
  id: "kaiwu",
  name: "Kaiwu",
  description: "Two-way bridge between OpenClaw and the Kaiwu desktop application.",
  register: registerBridgePlugin,
})
