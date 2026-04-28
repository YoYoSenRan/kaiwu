import { rmSync } from "node:fs"
import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import AutoImport from "unplugin-auto-import/vite"
import { defineConfig } from "vite"
import electron from "vite-plugin-electron/simple"
import pkg from "./package.json"

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  rmSync("dist-electron", { recursive: true, force: true })

  const isServe = command === "serve"
  const isBuild = command === "build"
  const sourcemap = isServe || !!process.env.VSCODE_DEBUG

  return {
    resolve: {
      alias: [
        { find: "@", replacement: path.join(__dirname, "app") },
        { find: /^@contracts\/(.*)$/, replacement: path.join(__dirname, "electron/features/$1/contracts") },
      ],
    },
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
    },
    plugins: [
      tailwindcss(),
      AutoImport({ imports: ["react", "react-router"], dts: "app/types/auto-imports.d.ts" }),
      react(),
      electron({
        main: {
          // Shortcut of `build.lib.entry`
          entry: "electron/main.ts",
          onstart(args) {
            if (process.env.VSCODE_DEBUG) {
              console.log(/* For `.vscode/.debug.script.mjs` */ "[startup] Electron App")
            } else {
              args.startup()
            }
          },
          vite: {
            build: {
              sourcemap,
              minify: isBuild,
              outDir: "dist-electron/main",
              rollupOptions: { external: Object.keys("dependencies" in pkg ? pkg.dependencies : {}) },
            },
          },
        },
        preload: {
          // Shortcut of `build.rollupOptions.input`.
          // Preload scripts may contain Web assets, so use the `build.rollupOptions.input` instead `build.lib.entry`.
          input: "electron/preload.ts",
          vite: {
            build: {
              minify: isBuild,
              outDir: "dist-electron/preload",
              sourcemap: sourcemap ? "inline" : undefined, // #332
              rollupOptions: { external: Object.keys("dependencies" in pkg ? pkg.dependencies : {}) },
            },
          },
        },
        // Ployfill the Electron and Node.js API for Renderer process.
        // If you want use Node.js in Renderer process, the `nodeIntegration` needs to be enabled in the Main process.
        // See 👉 https://github.com/electron-vite/vite-plugin-electron-renderer
        renderer: {},
      }),
    ],
    server: process.env.VSCODE_DEBUG
      ? (() => {
          const url = new URL(pkg.debug.env.VITE_DEV_SERVER_URL)
          return { host: url.hostname, port: +url.port }
        })()
      : undefined,
    clearScreen: false,
  }
})
