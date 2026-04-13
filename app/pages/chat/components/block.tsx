import { Streamdown } from "streamdown"
import { code } from "@streamdown/code"
import type { ContentBlock } from "@/lib/content"
import { ToolCard } from "./toolcard"
import { ThinkingBlock } from "./thinking"

const plugins = { code }

interface BlockProps {
  block: ContentBlock
  showToolCalls: boolean
  showThinking: boolean
}

/**
 * 单个 content block 的渲染分发。
 * 新增 block 类型只需在 switch 里加一个 case + 对应组件。
 * @param block 解析后的 ContentBlock
 * @param showToolCalls 是否显示工具调用
 * @param showThinking 是否显示推理过程
 */
export function MessageBlock({ block, showToolCalls, showThinking }: BlockProps) {
  switch (block.type) {
    case "text":
      return block.text ? <Streamdown plugins={plugins}>{block.text}</Streamdown> : null
    case "tool_use":
      return showToolCalls ? <ToolCard kind="call" name={block.name} detail={JSON.stringify(block.input, null, 2)} /> : null
    case "tool_result": {
      if (!showToolCalls) return null
      const text = typeof block.content === "string" ? block.content : JSON.stringify(block.content, null, 2)
      return <ToolCard kind="result" name="" detail={text} isError={block.is_error} />
    }
    case "thinking":
      return showThinking ? <ThinkingBlock content={block.thinking} /> : null
    // 预留：图像、音频等新类型在此扩展
    // case "image":
    // case "audio":
    default:
      return null
  }
}
