import "./styles/index.css"
// i18n 必须在首次渲染前初始化，且依赖 useSettingsStore 已恢复的 lang
import "./i18n"
import React from "react"
import ReactDOM from "react-dom/client"
import { HashRouter } from "react-router"
import App from "./App"

import { applyThemeClass, useSettingsStore } from "@/stores/settings"

// 首帧即刻 apply 持久化的 theme，避免页面加载时的主题闪烁
applyThemeClass(useSettingsStore.getState().theme)

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
)
