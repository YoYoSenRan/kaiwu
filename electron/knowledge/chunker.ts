/** 分块结果。 */
export interface Chunk {
  content: string
  position: number
}

/** 分块配置。 */
export interface ChunkOptions {
  /** 每个 chunk 的最大字符数，默认 1000。 */
  maxChars?: number
  /** 相邻 chunk 重叠字符数，默认 200。 */
  overlap?: number
}

/** 递归分割的分隔符优先级：段落 → 行 → 句子 → 空格。 */
const SEPARATORS = ["\n\n", "\n", ". ", " "]

/**
 * 递归字符分割。
 * 优先按段落 → 行 → 句子 → 空格切割，保证 chunk 不超过 maxChars。
 * @param text 待分块的纯文本
 * @param options 分块配置
 */
export function split(text: string, options?: ChunkOptions): Chunk[] {
  const maxChars = options?.maxChars ?? 1000
  const overlap = options?.overlap ?? 200

  const rawChunks = recursiveSplit(text, maxChars, 0)
  return addOverlap(rawChunks, overlap)
}

function recursiveSplit(text: string, maxChars: number, sepIndex: number): string[] {
  if (text.length <= maxChars) return [text]
  if (sepIndex >= SEPARATORS.length) {
    const chunks: string[] = []
    for (let i = 0; i < text.length; i += maxChars) {
      chunks.push(text.slice(i, i + maxChars))
    }
    return chunks
  }

  const sep = SEPARATORS[sepIndex]
  const parts = text.split(sep)
  const chunks: string[] = []
  let current = ""

  for (const part of parts) {
    const candidate = current ? current + sep + part : part
    if (candidate.length > maxChars && current) {
      chunks.push(current)
      current = part
    } else {
      current = candidate
    }
  }
  if (current) chunks.push(current)

  const result: string[] = []
  for (const chunk of chunks) {
    if (chunk.length > maxChars) {
      result.push(...recursiveSplit(chunk, maxChars, sepIndex + 1))
    } else {
      result.push(chunk)
    }
  }

  return result
}

function addOverlap(rawChunks: string[], overlap: number): Chunk[] {
  if (overlap <= 0 || rawChunks.length <= 1) {
    return rawChunks.map((content, i) => ({ content, position: i }))
  }

  return rawChunks.map((content, i) => {
    if (i === 0) return { content, position: i }
    const prev = rawChunks[i - 1]
    const overlapText = prev.slice(-overlap)
    return { content: overlapText + content, position: i }
  })
}
