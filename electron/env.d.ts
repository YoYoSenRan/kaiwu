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

// Vite 的 ?raw 导入：把文件内容作为 string 编译期嵌入 bundle，运行时无需 fs 访问
declare module "*.sql?raw" {
  const content: string
  export default content
}
