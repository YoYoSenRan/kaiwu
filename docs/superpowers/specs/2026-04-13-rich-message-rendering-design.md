# 富消息渲染

## 背景

kaiwu 当前只存提取后的纯文本（`extractText` 丢弃了 tool_use、thinking 等结构化内容块），导致无法渲染工具调用卡片和推理过程。OpenClaw 的 assistant 消息实际是 content blocks 数组，包含 text / tool_use / tool_result / thinking 等类型。

## 目标

1. `chat_messages.content` 改为存原始 content（JSON 数组或纯字符串），零信息丢失
2. 渲染层按 content block 类型分发渲染：文本、工具卡片、推理块
3. 提供 showToolCalls / showThinking 显示控制开关
4. 搜索在应用层做（方案 B），后续量大了再引入 FTS5

## 数据层变更

### content 字段语义变更

`chat_messages.content` 类型仍为 `TEXT NOT NULL`，但语义从"提取后的纯文本"变为"原始 content"：

- **user 消息**：纯字符串，如 `"你好"`
- **assistant 消息**：JSON 数组序列化，如 `'[{"type":"text","text":"..."},{"type":"tool_use",...}]'`
- **tool_result 消息**：JSON 数组序列化，如 `'[{"type":"tool_result","tool_use_id":"...","content":"..."}]'`
- **system 消息**：纯字符串

无需 migration——表结构不变，只是写入逻辑变了。现有纯文本数据在 `parseContent` 中被兼容处理为 string 类型。

### 解析函数

```ts
type ContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: unknown }
  | { type: "tool_result"; tool_use_id: string; content: string | unknown; is_error?: boolean }
  | { type: "thinking"; thinking: string }

function parseContent(content: string): string | ContentBlock[] {
  try {
    const parsed = JSON.parse(content)
    if (Array.isArray(parsed)) return parsed
  } catch {}
  return content
}
```

### 写入变更

- `service.ts:insertAgentMessageWithInvocation` —— content 参数改为接受原始 message content（JSON 序列化后的字符串）
- `service.ts:insertPendingUserMessage` —— 不变（user 消息本身就是纯文本）
- `service.ts:syncMessages` —— 补录时存原始 `JSON.stringify(remote.content)` 而非 `extractText(remote.content)`
- `orchestrator.ts` —— onFinal 拿到的 message 改为原始 content JSON 字符串
- `runner.ts` —— onFinal 回调传原始 message content（JSON.stringify），onDelta 仍传纯文本（流式只有 text）
- `content_hash` 计算 —— 基于 `extractText(content)` 的结果，不变

### extractText 保留

`extractText` 函数保留在 service.ts 中，用于：

- `content_hash` 计算
- `syncMessages` 中 user 消息的去重比对
- 对话列表中的最后一条消息预览（后续）
- 应用层搜索过滤

## 渲染层

### content block 分发

`messages.tsx` 中 agent 消息的渲染从直接 `<Streamdown>{msg.content}</Streamdown>` 改为按块分发：

```
parseContent(msg.content)
  ├─ string → <Streamdown>{content}</Streamdown>（纯文本，兼容旧数据）
  └─ ContentBlock[] → blocks.map(block => {
      switch (block.type) {
        case "text"        → <Streamdown>{block.text}</Streamdown>
        case "tool_use"    → <ToolCard />（受 showToolCalls 控制）
        case "tool_result" → <ToolResult />（受 showToolCalls 控制）
        case "thinking"    → <ThinkingBlock />（受 showThinking 控制）
      }
    })
```

### 工具调用卡片（ToolCard）

新建 `app/pages/chat/components/toolcard.tsx`：

```
<details class="折叠">
  <summary>
    [齿轮图标] {toolName}
  </summary>
  <pre>{JSON.stringify(input, null, 2)}</pre>  -- 参数
</details>
```

### 工具结果（ToolResult）

复用 toolcard.tsx，按输出长度分策略：

- 短输出（≤80 字符）：内联显示
- 长输出（>80 字符）：折叠，显示前 2 行预览
- 错误结果（is_error: true）：红色边框

### 推理块（ThinkingBlock）

新建 `app/pages/chat/components/thinking.tsx`：

```
<details class="折叠，默认收起">
  <summary>[脑图标] 推理过程</summary>
  <div class="斜体/淡色文本">
    <Streamdown>{thinking}</Streamdown>
  </div>
</details>
```

### 显示控制

在对话 config JSON（`chats.config`）中加两个开关：

```ts
{
  showToolCalls: false,   // 默认隐藏工具调用
  showThinking: false,    // 默认隐藏推理过程
}
```

UI 入口：在 ChatHeader 或 InfoPanel 中放两个 toggle 按钮。切换时调用 `window.electron.chat.updateConfig(chatId, { showToolCalls: true })`。

store 层：从 `chat.config` 中解析这两个布尔值供渲染层使用。

### 流式输出

流式阶段（onDelta）仍然只是纯文本——OpenClaw 的 delta 事件推送的是累积文本，不包含 tool_use / thinking 的结构化数据。这些只在 final 事件中才有完整结构。

所以流式渲染逻辑不变，只有 final 后的消息列表渲染走新的 block 分发。

## 涉及文件

| 文件                                     | 改动                                     |
| ---------------------------------------- | ---------------------------------------- |
| `electron/engine/runner.ts`              | onFinal 传原始 content JSON              |
| `electron/features/chat/service.ts`      | 写入原始 content，extractText 仅做工具用 |
| `electron/features/chat/orchestrator.ts` | 适配 content 参数变更                    |
| `electron/features/chat/ipc.ts`          | 无变更                                   |
| `app/pages/chat/components/messages.tsx` | content block 分发渲染                   |
| `app/pages/chat/components/toolcard.tsx` | 新建：工具调用/结果卡片                  |
| `app/pages/chat/components/thinking.tsx` | 新建：可折叠推理块                       |
| `app/pages/chat/components/header.tsx`   | 添加 showToolCalls / showThinking toggle |
| `app/stores/chat.ts`                     | 无结构变更（config 解析在组件层做）      |

## 收尾

实施完成后清空聊天数据，重新测试同步以验证完整链路。
