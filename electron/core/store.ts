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
  defaults: {
    windowBounds: {
      width: 800,
      height: 600,
    },
  },
})

export default store
