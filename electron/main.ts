import "reflect-metadata"
import { app } from "electron"
import { scope } from "./infra/logger"
import { modules } from "./app/modules"
import { bootstrap } from "./app/bootstrap"

const startup = scope("startup")

bootstrap(modules).catch((err: unknown) => {
  startup.error("启动失败", err)
  app.exit(1)
})
