import i18n from "i18next"
import en from "./locales/en.json"
import zhCN from "./locales/zh-CN.json"
import { initReactI18next } from "react-i18next"
import { useSettingsStore } from "@/stores/settings"

i18n.use(initReactI18next).init({
  resources: {
    "zh-CN": { translation: zhCN },
    en: { translation: en },
  },
  // 从 zustand persist 恢复的 lang 读取（persist 是同步 rehydration）
  lng: useSettingsStore.getState().lang,
  fallbackLng: "zh-CN",
  interpolation: {
    escapeValue: false,
  },
})

export default i18n
