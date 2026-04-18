import "reflect-metadata"
import { app } from "electron"
import { scope } from "./infra/logger"
import { isDev } from "./infra/env"
import { modules } from "./app/modules"
import { bootstrap } from "./app/bootstrap"

// dev 模式下 Vite HMR 必需 unsafe-eval，Electron 会警告；prod CSP 严格，不受影响
if (isDev) process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = "true"

const startup = scope("startup")

bootstrap(modules).catch((err: unknown) => {
  startup.error("启动失败", err)
  app.exit(1)
})
