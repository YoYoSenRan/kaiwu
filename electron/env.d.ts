/// <reference types="vite-plugin-electron/electron-env" />

// 主进程环境变量声明
// vite-plugin-electron 的 ambient 类型已声明 NODE_ENV / VITE_DEV_SERVER_URL，
// 这里追加项目特有的字段
declare namespace NodeJS {
  interface ProcessEnv {
    /** VS Code 调试启动器设置，触发 sourcemap 和不同的 onstart 行为 */
    VSCODE_DEBUG?: "true"
  }
}
