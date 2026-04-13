# 富消息渲染 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** content 存原始数据，按 block 类型分发渲染（文本/工具卡片/推理块），提供显示控制开关，为图像/音频/FTS5 预留扩展点。

**Architecture:** runner 层传原始 message content 而非提取文本；service 层存 `JSON.stringify(content)` 原始数据；渲染层通过 `parseContent()` 解析后按 block.type 分发到独立组件（MessageBlock → TextBlock / ToolCard / ThinkingBlock / UnknownBlock）。新增 block 类型只需加一个组件 + switch case。

**Tech Stack:** React 19, Streamdown, Tailwind v4, shadcn/ui, zustand, drizzle-orm

**Spec:** `docs/superpowers/specs/2026-04-13-rich-message-rendering-design.md`

---

### Task 1: ContentBlock 类型定义 + parseContent 工具函数

**Files:**

- Create: `app/lib/content.ts`

- [ ] **Step 1: 创建 content.ts**

```ts
// app/lib/content.ts

/** 所有可能的 content block 类型。新增类型在此扩展即可。 */
export type ContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: unknown }
  | { type: "tool_result"; tool_use_id: string; content: string | unknown; is_error?: boolean }
  | { type: "thinking"; thinking: string }
  | { type: "image"; source: { type: string; data?: string; media_type?: string; url?: string } }
  | { type: "audio"; source: { type: string; data?: string; media_type?: string } }

/**
 * 解析 chat_messages.content 字段。
 * user 消息是纯字符串，agent 消息是 JSON 数组。
 * 旧数据（纯文本 agent 消息）也能兼容——当作 string 返回。
 * @param content DB 中的 content 字段
 */
export function parseContent(content: string): string | ContentBlock[] {
  if (!content.startsWith("[")) return content
  try {
    const parsed = JSON.parse(content)
    if (Array.isArray(parsed)) return parsed as ContentBlock[]
  } catch {
    // JSON 解析失败，当纯文本处理
  }
  return content
}

/**
 * 从原始 content 中提取纯文本。用于搜索、摘要、content_hash 等场景。
 * @param content DB 中的 content 字段，或远程消息的 content（string | unknown[]）
 */
export function extractPlainText(content: unknown): string {
  if (typeof content === "string") {
    // 可能是 JSON 数组字符串，也可能是纯文本
    const parsed = parseContent(content)
    if (typeof parsed === "string") return parsed
    return parsed
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join("")
  }
  if (!Array.isArray(content)) return ""
  return (content as Array<{ type?: string; text?: string }>)
    .filter((c) => c.type === "text" && c.text)
    .map((c) => c.text!)
    .join("")
}
```

- [ ] **Step 2: 类型检查**

Run: `npx tsc --noEmit 2>&1 | grep "content.ts" || echo "无错误"`
Expected: 无错误

- [ ] **Step 3: Commit**

```bash
git add app/lib/content.ts
git commit -m "feat: ContentBlock 类型定义和 parseContent / extractPlainText 工具函数"
```

---

### Task 2: runner + service + orchestrator 存原始 content

**Files:**

- Modify: `electron/engine/runner.ts:53-57`
- Modify: `electron/engine/types.ts:53-54`
- Modify: `electron/features/chat/service.ts:130-159,227-238,262-330`
- Modify: `electron/features/chat/orchestrator.ts:89-93,122,209-211,300`

- [ ] **Step 1: runner.ts——onFinal 传原始 content JSON 字符串**

在 `electron/engine/runner.ts` 中，将 `case "final"` 块改为：

```ts
          case "final": {
            signal?.removeEventListener("abort", onAbort)
            const rawContent = serializeContent(event.message)
            const invocation = buildInvocationData(event.runId, event.raw)
            onFinal(rawContent, invocation)
            resolve()
            break
          }
```

在文件中 `extractText` 函数之后添加 `serializeContent`：

```ts
/**
 * 将 gateway 消息对象的 content 序列化为存储格式。
 * content 为数组时 JSON.stringify 保持结构，为字符串时直接返回。
 */
function serializeContent(message: unknown): string {
  if (!message) return ""
  if (typeof message === "string") return message
  const msg = message as { content?: unknown }
  if (typeof msg.content === "string") return msg.content
  if (Array.isArray(msg.content)) return JSON.stringify(msg.content)
  return extractText(message)
}
```

注意：`onDelta` 仍然用 `extractText`——流式阶段只有纯文本。

- [ ] **Step 2: engine/types.ts——onFinal 参数重命名为 rawContent**

将 `EngineRunParams.onFinal` 签名注释更新，参数名保持 `message` 不变（兼容性），但含义变了：

```ts
  /** message 为原始 content：纯字符串或 JSON 数组序列化。 */
  onFinal: (message: string, invocation: InvocationData) => void
```

仅更新注释，签名本身不变。

- [ ] **Step 3: service.ts——insertAgentMessageWithInvocation 的 content_hash 基于提取文本**

`insertAgentMessageWithInvocation` 中 `content` 参数现在是原始 JSON 字符串。`content_hash` 需要基于提取后的纯文本计算（否则 JSON 格式差异会导致 hash 不稳定）。

在 `electron/features/chat/service.ts` 顶部 import 区添加（注意 service 在主进程，不能用 `@/` 别名，用相对路径引 `app/lib` 也不对——把 `extractPlainText` 逻辑复用现有的 `extractText`）：

实际改法：`contentHash` 函数改为先提取纯文本再 hash：

```ts
export function contentHash(content: string): string {
  const text = extractText(content)
  return createHash("sha256").update(text.slice(0, 100)).digest("hex").slice(0, 16)
}
```

同时将 `extractText` 从 `private` 改为 `export`（其他地方可能需要）：

```ts
export function extractText(content: unknown): string {
```

- [ ] **Step 4: service.ts——syncMessages 存原始 content**

在 `syncMessages` 中，将 assistant 消息的写入从 `extractText(remote.content)` 改为 `JSON.stringify(remote.content)`：

找到这一行（约 line 300）：

```ts
insertAgentMessageWithInvocation(chatId, agentId, text, sessionKey, invocation)
```

改为：

```ts
const rawContent = Array.isArray(remote.content) ? JSON.stringify(remote.content) : text
insertAgentMessageWithInvocation(chatId, agentId, rawContent, sessionKey, invocation)
```

user 消息的存储也同理——不过 user 消息的 content 通常就是纯字符串，无需改。

对 user 消息的空内容检查需要调整——当前 `if (!text) continue` 对 assistant 消息也会跳过纯工具消息（没有 text block 但有 tool_use）。改为：

```ts
const text = extractText(remote.content)
const hasContent = text || (Array.isArray(remote.content) && remote.content.length > 0)
if (!hasContent) continue
```

- [ ] **Step 5: orchestrator.ts——onFinal 传下来的 message 已是原始 content，直接存**

orchestrator.ts 中 `onFinal` 回调的 `message` 参数现在是原始 content JSON 字符串（来自 runner 的 `serializeContent`），直接传给 `insertAgentMessageWithInvocation` 即可——**不需要改代码**，因为 orchestrator 本身只是透传。

但 `log.info` 那行需要容错——原始 content 可能是很长的 JSON 数组：

```ts
    onFinal: (message, invocation) => {
      log.info(`final: ${message.slice(0, 120)}`)
```

将 `100` 改为 `120`（微调，可选）。

圆桌 `runSingleTurn` 中的 `onFinal` 同理，不需要改——已经是透传。

- [ ] **Step 6: 类型检查**

Run: `npx tsc --noEmit 2>&1 | grep -v "sidebar\|agent\.ts" | head -10`
Expected: 无新增错误

- [ ] **Step 7: Commit**

```bash
git add electron/engine/runner.ts electron/engine/types.ts electron/features/chat/service.ts electron/features/chat/orchestrator.ts
git commit -m "feat: content 存原始数据——runner 传原始 JSON，service 存完整 content blocks"
```

---

### Task 3: 渲染层——MessageBlock 分发组件

**Files:**

- Create: `app/pages/chat/components/block.tsx`
- Modify: `app/pages/chat/components/messages.tsx`

- [ ] **Step 1: 创建 block.tsx——content block 分发渲染**

```tsx
// app/pages/chat/components/block.tsx
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
```

- [ ] **Step 2: 更新 messages.tsx——agent 消息使用 block 分发**

在 `app/pages/chat/components/messages.tsx` 中：

添加 import：

```ts
import { parseContent } from "@/lib/content"
import { MessageBlock } from "./block"
```

在组件顶部，解析当前对话的 config 获取显示控制开关。从 store 取 active chat 的 config：

```ts
const activeChat = useChatStore((s) => s.chats.find((c) => c.id === s.activeId))
const chatConfig = useMemo(() => {
  try {
    return JSON.parse(activeChat?.config ?? "{}") as Record<string, unknown>
  } catch {
    return {}
  }
}, [activeChat?.config])
const showToolCalls = chatConfig.showToolCalls === true
const showThinking = chatConfig.showThinking === true
```

将 agent 消息的渲染部分，从：

```tsx
<div className={`${isMultiAgent ? color.bg : "bg-muted/50"} max-w-[85%] rounded-xl rounded-tl-sm px-3 py-2 text-sm`}>
  <Streamdown plugins={plugins}>{msg.content}</Streamdown>
</div>
```

替换为：

```tsx
<div className={`${isMultiAgent ? color.bg : "bg-muted/50"} max-w-[85%] rounded-xl rounded-tl-sm px-3 py-2 text-sm`}>
  {renderAgentContent(msg.content, showToolCalls, showThinking)}
</div>
```

在文件底部（`formatTokens` 之后）添加 helper：

```tsx
/** 渲染 agent 消息内容：解析 content blocks 并分发渲染。 */
function renderAgentContent(content: string, showToolCalls: boolean, showThinking: boolean) {
  const parsed = parseContent(content)
  // 纯文本（旧数据或纯字符串）
  if (typeof parsed === "string") {
    return <Streamdown plugins={plugins}>{parsed}</Streamdown>
  }
  // content blocks 数组
  const blocks = parsed.map((block, i) => <MessageBlock key={i} block={block} showToolCalls={showToolCalls} showThinking={showThinking} />)
  // 过滤掉 null（被隐藏的 block）
  return blocks.length > 0 ? <>{blocks}</> : null
}
```

同时删除 messages.tsx 顶部的 Streamdown 和 code import（已移到 block.tsx），以及 `const plugins = { code }` 行。但注意流式输出区域仍然直接用 Streamdown——所以保留 import，改为只在流式区域使用。

实际改法：保留 Streamdown import 和 plugins 不变（流式区域需要），`renderAgentContent` 中也用同一个 plugins。在 `block.tsx` 和 `messages.tsx` 中都 import Streamdown 是可以的。

- [ ] **Step 3: 类型检查**

Run: `npx tsc --noEmit 2>&1 | grep -E "(block|messages|content)\.tsx?" | head -10`
Expected: 可能有 toolcard.tsx / thinking.tsx 不存在的错误（下个 Task 创建）

- [ ] **Step 4: Commit**

```bash
git add app/lib/content.ts app/pages/chat/components/block.tsx app/pages/chat/components/messages.tsx
git commit -m "feat: content block 分发渲染——parseContent + MessageBlock 组件"
```

---

### Task 4: ToolCard 组件

**Files:**

- Create: `app/pages/chat/components/toolcard.tsx`

- [ ] **Step 1: 创建 toolcard.tsx**

```tsx
// app/pages/chat/components/toolcard.tsx
import { useTranslation } from "react-i18next"
import { Wrench, AlertTriangle } from "lucide-react"

/** 工具输出内联显示的最大字符数。超过则折叠。 */
const INLINE_THRESHOLD = 80

interface ToolCardProps {
  kind: "call" | "result"
  name: string
  detail: string
  isError?: boolean
}

/**
 * 工具调用/结果卡片。短输出内联，长输出折叠预览。
 * @param kind "call" = 工具调用（显示参数），"result" = 工具结果（显示输出）
 * @param name 工具名称
 * @param detail 参数 JSON 或输出文本
 * @param isError 是否为错误结果
 */
export function ToolCard({ kind, name, detail, isError }: ToolCardProps) {
  const { t } = useTranslation()
  const isShort = detail.length <= INLINE_THRESHOLD
  const label = kind === "call" ? name || t("chat.tool.call") : name || t("chat.tool.result")
  const Icon = isError ? AlertTriangle : Wrench

  return (
    <details className="border-border/50 bg-muted/30 my-1.5 rounded-lg border text-xs">
      <summary className="flex cursor-pointer items-center gap-1.5 px-2.5 py-1.5 select-none">
        <Icon className={`size-3 shrink-0 ${isError ? "text-destructive" : "text-muted-foreground"}`} />
        <span className="font-medium">{label}</span>
        {isShort && detail && <span className="text-muted-foreground/70 ml-auto max-w-[200px] truncate">{detail}</span>}
      </summary>
      {!isShort && (
        <pre className="border-border/50 text-muted-foreground overflow-x-auto border-t px-2.5 py-2 text-[11px] leading-relaxed break-all whitespace-pre-wrap">{detail}</pre>
      )}
    </details>
  )
}
```

- [ ] **Step 2: 类型检查**

Run: `npx tsc --noEmit 2>&1 | grep "toolcard" || echo "无错误"`
Expected: 无错误

- [ ] **Step 3: Commit**

```bash
git add app/pages/chat/components/toolcard.tsx
git commit -m "feat: ToolCard 组件——工具调用/结果的折叠卡片"
```

---

### Task 5: ThinkingBlock 组件

**Files:**

- Create: `app/pages/chat/components/thinking.tsx`

- [ ] **Step 1: 创建 thinking.tsx**

```tsx
// app/pages/chat/components/thinking.tsx
import { useTranslation } from "react-i18next"
import { Brain } from "lucide-react"
import { Streamdown } from "streamdown"
import { code } from "@streamdown/code"

const plugins = { code }

interface ThinkingBlockProps {
  content: string
}

/**
 * 可折叠的推理过程块。默认收起，点击展开查看 agent 的思考过程。
 * @param content thinking 文本
 */
export function ThinkingBlock({ content }: ThinkingBlockProps) {
  const { t } = useTranslation()

  if (!content) return null

  return (
    <details className="border-border/50 bg-muted/20 my-1.5 rounded-lg border">
      <summary className="flex cursor-pointer items-center gap-1.5 px-2.5 py-1.5 text-xs select-none">
        <Brain className="text-muted-foreground size-3 shrink-0" />
        <span className="text-muted-foreground font-medium">{t("chat.thinking")}</span>
      </summary>
      <div className="border-border/50 text-muted-foreground/80 border-t px-2.5 py-2 text-sm italic">
        <Streamdown plugins={plugins}>{content}</Streamdown>
      </div>
    </details>
  )
}
```

- [ ] **Step 2: 类型检查**

Run: `npx tsc --noEmit 2>&1 | grep "thinking" || echo "无错误"`
Expected: 无错误

- [ ] **Step 3: Commit**

```bash
git add app/pages/chat/components/thinking.tsx
git commit -m "feat: ThinkingBlock 组件——可折叠的推理过程块"
```

---

### Task 6: 显示控制开关（ChatHeader toggle）

**Files:**

- Modify: `app/pages/chat/components/header.tsx`
- Modify: `app/i18n/locales/zh-CN.json`
- Modify: `app/i18n/locales/en.json`

- [ ] **Step 1: 更新 header.tsx——添加 toggle 按钮**

在 `app/pages/chat/components/header.tsx` 中：

更新 import：

```ts
import { Brain, Pause, Play, Square, Wrench } from "lucide-react"
```

更新 ChatHeaderProps 接口：

```ts
interface ChatHeaderProps {
  chat: { id: string; title: string; mode: string; config: string }
}
```

在组件内部，解析 config 并添加 toggle 逻辑：

```tsx
const config = useMemo(() => {
  try {
    return JSON.parse(chat.config) as Record<string, unknown>
  } catch {
    return {}
  }
}, [chat.config])
const showToolCalls = config.showToolCalls === true
const showThinking = config.showThinking === true

const toggleConfig = (key: string, current: boolean) => {
  window.electron.chat
    .updateConfig(chat.id, { [key]: !current })
    .then(() => window.electron.chat.detail(chat.id))
    .then((updated) => {
      const chats = useChatStore.getState().chats.map((c) => (c.id === updated.id ? updated : c))
      useChatStore.getState().setChats(chats)
    })
}
```

在标题右侧、圆桌按钮之前，添加 toggle 按钮组：

```tsx
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => toggleConfig("showToolCalls", showToolCalls)}
          title={t("chat.toggle.toolCalls")}
          className={showToolCalls ? "text-foreground" : "text-muted-foreground/40"}
        >
          <Wrench className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => toggleConfig("showThinking", showThinking)}
          title={t("chat.toggle.thinking")}
          className={showThinking ? "text-foreground" : "text-muted-foreground/40"}
        >
          <Brain className="size-3.5" />
        </Button>

        {isRoundtable && (
          /* ...existing roundtable buttons... */
        )}
      </div>
```

注意：toggle 按钮和圆桌按钮都在右侧 `flex items-center gap-1` 容器内，toggle 在前，圆桌在后。

- [ ] **Step 2: 添加 i18n 翻译键**

在 `app/i18n/locales/zh-CN.json` 的 `chat` 对象中添加：

```json
    "toggle": {
      "toolCalls": "显示工具调用",
      "thinking": "显示推理过程"
    },
    "thinking": "推理过程",
    "tool": {
      "call": "工具调用",
      "result": "工具结果"
    }
```

在 `app/i18n/locales/en.json` 的 `chat` 对象中添加：

```json
    "toggle": {
      "toolCalls": "Show tool calls",
      "thinking": "Show thinking"
    },
    "thinking": "Thinking",
    "tool": {
      "call": "Tool call",
      "result": "Tool result"
    }
```

- [ ] **Step 3: 类型检查 + lint**

Run: `npx tsc --noEmit 2>&1 | grep -v "sidebar\|agent\.ts" | head -10 && pnpm lint`
Expected: 通过

- [ ] **Step 4: Commit**

```bash
git add app/pages/chat/components/header.tsx app/i18n/locales/zh-CN.json app/i18n/locales/en.json
git commit -m "feat: ChatHeader 添加 showToolCalls / showThinking 显示控制开关"
```

---

### Task 7: 全量验证 + 清空数据

**Files:**

- 无新文件

- [ ] **Step 1: 完整类型检查**

Run: `npx tsc --noEmit`
Expected: 无新增错误

- [ ] **Step 2: Lint**

Run: `pnpm lint`
Expected: 通过

- [ ] **Step 3: 清空聊天数据**

```bash
sqlite3 "$HOME/Library/Application Support/kaiwu/kaiwu.db" "
DELETE FROM chat_invocations;
DELETE FROM chat_messages;
DELETE FROM chat_members;
DELETE FROM chats;
"
```

- [ ] **Step 4: 启动应用验证**

Run: `pnpm dev`
验证：

1. 新建对话 → 发消息 → agent 回复显示正常
2. 如果 agent 使用了工具，header 点亮工具图标后可看到折叠的工具卡片
3. 如果 agent 有 thinking，header 点亮推理图标后可看到折叠的推理块
4. 切换开关，卡片/推理块正确显示/隐藏
5. 对话列表切换后重新加载消息无异常

- [ ] **Step 5: 最终 Commit（如有 lint 修复）**

```bash
git status
# 如果有改动
git add -A && git commit -m "chore: lint 自动修复"
```
