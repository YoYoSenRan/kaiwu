import Store from "electron-store"

/** 持久化数据 schema */
export interface StoreSchema {
  windowBounds: {
    x?: number
    y?: number
    width: number
    height: number
  }
  embedding: {
    provider: "local" | "remote"
    localModel: string
    remote: { endpoint: string; apiKey: string; model: string }
  }
}

const store = new Store<StoreSchema>({
  defaults: {
    windowBounds: {
      width: 800,
      height: 600,
    },
    embedding: {
      provider: "local",
      localModel: "Xenova/bge-small-zh-v1.5",
      remote: { endpoint: "", apiKey: "", model: "" },
    },
  },
})

export default store
