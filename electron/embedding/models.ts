/** 本地 embedding 模型定义。 */
export interface LocalModelDef {
  /** HuggingFace 模型 ID。 */
  id: string
  /** 显示名称。 */
  name: string
  /** 向量维度。 */
  dimensions: number
  /** 模型体积描述。 */
  size: string
  /** 优化语言。 */
  lang: "zh" | "en" | "multilingual"
}

/** 内置支持的本地模型列表。 */
export const LOCAL_MODELS: LocalModelDef[] = [
  { id: "Xenova/bge-small-zh-v1.5", name: "BGE Small 中文 v1.5", dimensions: 512, size: "~90MB", lang: "zh" },
  { id: "Xenova/all-MiniLM-L6-v2", name: "MiniLM L6 v2", dimensions: 384, size: "~23MB", lang: "multilingual" },
]

/** 默认模型 ID。 */
export const DEFAULT_MODEL = LOCAL_MODELS[0].id
