import Store from "electron-store"

/** 持久化数据 schema */
export interface StoreSchema {
  windowBounds: {
    x?: number
    y?: number
    width: number
    height: number
  }
}

const store = new Store<StoreSchema>({
  encryptionKey: "kaiwu-store-v1",
  defaults: {
    windowBounds: {
      width: 800,
      height: 600,
    },
  },
})

export default store
