# 知识库功能设计

> 日期：2026-04-12
> 状态：已确认，待实施

## 一、目标

为 kaiwu 桌面应用增加完整的知识库能力：文档上传 → 解析 → 分块 → 向量化 → 检索。知识库全局独立，agent 可绑定多个知识库。

## 二、架构总览

```
electron/
├── db/                         # SQLite 关系数据（已有）
├── embedding/                  # 向量化引擎（新增，基础设施层）
│   ├── engine.ts               # 引擎抽象 + 本地/远程切换
│   ├── local.ts                # Transformers.js ONNX 本地推理
│   ├── remote.ts               # OpenAI 兼容 API
│   └── worker.ts               # Worker 线程，防阻塞主进程
├── core/
│   └── vector.ts               # LanceDB 实例管理（新增，同 db/client.ts 定位）
└── features/
    └── knowledge/              # 知识库业务 feature（新增）
        ├── channels.ts
        ├── types.ts
        ├── ipc.ts
        ├── bridge.ts
        ├── service.ts
        ├── core/
        │   ├── parser.ts       # 解析调度
        │   ├── chunker.ts      # 分块策略
        │   ├── search.ts       # 混合检索（向量 + BM25）
        │   └── pipeline.ts     # 文档处理编排
        └── parsers/
            ├── markdown.ts
            ├── pdf.ts
            ├── docx.ts
            ├── excel.ts
            └── txt.ts

app/pages/knowledge/
├── list/                       # /knowledge 路由
│   ├── index.tsx
│   └── components/
│       ├── card.tsx
│       └── create-dialog.tsx
├── detail/                     # /knowledge/:id 路由
│   ├── index.tsx
│   └── components/
│       ├── documents-tab.tsx
│       ├── search-tab.tsx
│       ├── settings-tab.tsx
│       └── upload-zone.tsx
├── components/                 # list / detail 共享
│   └── delete-dialog.tsx
└── hooks/
    └── use-knowledge.ts
```

**设计原则**：

- `embedding/` 是基础设施层，和 `db/` 同级，任何 feature 可依赖
- `core/vector.ts` 管 LanceDB 实例，和 `db/client.ts` 管 SQLite 同一个角色
- `features/knowledge/` 是业务 feature，遵循 `ipc.md` 的文件结构模板
- parser / chunker 留在 knowledge 内部，不需要独立 feature（只服务于文档处理 pipeline）

## 三、数据模型

### 3.1 SQLite 表（drizzle schema 扩展）

#### knowledges

| 列              | 类型    | 约束               | 说明                                          |
| --------------- | ------- | ------------------ | --------------------------------------------- |
| id              | TEXT    | PK                 | nanoid                                        |
| name            | TEXT    | NOT NULL           | 知识库名称                                    |
| description     | TEXT    |                    | 知识库描述                                    |
| embedding_model | TEXT    | NOT NULL           | 建库时锁定的模型标识，换模型需重建全部 chunks |
| chunk_count     | INTEGER | NOT NULL DEFAULT 0 | 冗余计数，列表页不需要 join 聚合              |
| doc_count       | INTEGER | NOT NULL DEFAULT 0 | 同上                                          |
| created_at      | INTEGER | NOT NULL           | 毫秒时间戳                                    |
| updated_at      | INTEGER | NOT NULL           | 毫秒时间戳                                    |

索引：`idx_knowledges_created (created_at DESC)`

#### knowledge_documents

| 列          | 类型    | 约束                         | 说明                                          |
| ----------- | ------- | ---------------------------- | --------------------------------------------- |
| id          | TEXT    | PK                           | nanoid                                        |
| kb_id       | TEXT    | FK → knowledges.id, NOT NULL | 所属知识库                                    |
| title       | TEXT    | NOT NULL                     | 原始文件名                                    |
| format      | TEXT    | NOT NULL                     | "md" / "pdf" / "docx" / "xlsx" / "txt"        |
| size        | INTEGER | NOT NULL                     | 原始文件字节数                                |
| chunk_count | INTEGER | NOT NULL DEFAULT 0           | 该文档的分块数                                |
| state       | TEXT    | NOT NULL                     | "pending" / "processing" / "ready" / "failed" |
| error       | TEXT    |                              | 失败原因                                      |
| created_at  | INTEGER | NOT NULL                     | 毫秒时间戳                                    |
| updated_at  | INTEGER | NOT NULL                     | 毫秒时间戳                                    |

索引：`idx_kd_kb (kb_id, state)`

#### agent_knowledge

| 列       | 类型 | 约束               | 说明          |
| -------- | ---- | ------------------ | ------------- |
| agent_id | TEXT | FK → agents.id     | 本地 agent id |
| kb_id    | TEXT | FK → knowledges.id | 知识库 id     |

主键：`PRIMARY KEY (agent_id, kb_id)`

### 3.2 LanceDB 表

#### knowledge_chunks（全局单表）

| 列       | 类型        | 说明                           |
| -------- | ----------- | ------------------------------ |
| id       | TEXT        | nanoid                         |
| kb_id    | TEXT        | 过滤用，对应 knowledges.id     |
| doc_id   | TEXT        | 对应 knowledge_documents.id    |
| content  | TEXT        | 原始文本                       |
| vector   | VECTOR[dim] | embedding 向量，维度由模型决定 |
| position | INTEGER     | chunk 在文档中的序号           |
| metadata | TEXT        | JSON，标题/页码等上下文信息    |

单表设计，按 `kb_id` 字段过滤。所有知识库共用同一 embedding 模型和维度。

### 3.3 设计要点

- SQLite 管关系（CRUD、状态、关联），LanceDB 管向量（检索）
- `embedding_model` 锁在 `knowledges` 级别——同库所有文档同模型同维度
- 文档状态机：`pending → processing → ready`，失败 `processing → failed`
- `knowledges.chunk_count` / `doc_count` 是冗余字段，文档入库/删除时事务内同步更新
- 删知识库时 SQLite 删三表 + LanceDB `delete where kb_id = xxx`

## 四、Embedding 基础设施层

### 4.1 目录与职责

```
electron/embedding/
├── engine.ts      # 引擎抽象：统一接口 + 本地/远程切换
├── local.ts       # Transformers.js ONNX 本地推理
├── remote.ts      # OpenAI 兼容 API 调用
└── worker.ts      # Worker 线程包装，防阻塞主进程
```

### 4.2 核心接口

```ts
/** 单条 embedding 结果。 */
interface EmbeddingResult {
  vector: number[]
  tokenCount: number
}

/** 引擎统一接口，本地和远程都实现。 */
interface EmbeddingProvider {
  /** 模型标识，写入 knowledges.embedding_model。 */
  readonly model: string
  /** 向量维度，建表/校验一致性时用。 */
  readonly dimensions: number
  /** 批量向量化。 */
  embed(texts: string[]): Promise<EmbeddingResult[]>
}
```

### 4.3 engine.ts

- `getProvider(): EmbeddingProvider` — 返回当前激活的 provider
- `setProvider(type, config?)` — 切换引擎，远程需传 API key / endpoint
- 默认本地，用户可在设置中切换远程
- provider 全局单例，惰性初始化

### 4.4 local.ts

基于 `@huggingface/transformers`（Transformers.js v3）：

- 首次调用时下载 ONNX 模型到 `app.getPath('userData')/models/`
- 默认模型：`bge-small-zh-v1.5`（中文优化，512 维，~90MB）
- `embed()` 内部调 Worker 线程执行，主进程只做消息传递
- 暴露下载进度事件，前端可展示模型下载状态

### 4.5 remote.ts

OpenAI 兼容 API：

- 支持任何 OpenAI 兼容 endpoint（OpenAI / 硅基流动 / Ollama 等）
- 配置项：`endpoint` / `apiKey` / `model`
- `embed()` 走 HTTP POST，处理速率限制和重试

### 4.6 worker.ts

Worker 线程封装：

- 本地推理在 Worker 内执行，避免 ONNX Runtime 阻塞主进程 IPC
- 主进程通过 `postMessage` / `onMessage` 通信
- Worker 内部持有 Transformers.js pipeline 实例
- 支持传递下载进度事件回主进程

### 4.7 数据流

```
主进程调用 engine.getProvider().embed(texts)
  ├── 本地 → local.ts → postMessage → worker.ts（Worker 线程）
  │                                      └── Transformers.js pipeline
  │                                      └── 结果 postMessage 回主进程
  └── 远程 → remote.ts → HTTP POST → API 返回
```

### 4.8 依赖

```json
{ "@huggingface/transformers": "^3.x" }
```

Transformers.js v3 内置 ONNX Runtime，不需要额外装 onnxruntime-node。

## 五、LanceDB 实例管理

### core/vector.ts

和 `db/client.ts` 定位一致——全局单例，惰性打开：

```ts
/** 获取 LanceDB 连接实例（首次调用时打开）。 */
getVectorDb(): Promise<Connection>

/** 关闭连接，app before-quit 时调用。 */
closeVectorDb(): Promise<void>
```

- 数据目录：`app.getPath('userData')/vector/`
- 连接实例全局唯一，多处调用共享
- `main.ts` 的 `before-quit` 加 `closeVectorDb()`

依赖：`{ "@lancedb/lancedb": "^0.x" }`

## 六、Knowledge Feature 业务层

### 6.1 channels.ts

```ts
export const knowledgeChannels = {
  base: {
    list: "knowledge:base:list",
    create: "knowledge:base:create",
    update: "knowledge:base:update",
    delete: "knowledge:base:delete",
    detail: "knowledge:base:detail",
  },
  doc: {
    upload: "knowledge:doc:upload",
    delete: "knowledge:doc:delete",
    list: "knowledge:doc:list",
    retry: "knowledge:doc:retry",
    progress: "knowledge:doc:progress",
  },
  search: {
    query: "knowledge:search:query",
  },
  bind: {
    list: "knowledge:bind:list",
    set: "knowledge:bind:set",
  },
} as const
```

### 6.2 Bridge 接口

```ts
/** 文档处理进度事件。 */
interface DocProgressEvent {
  docId: string
  state: "processing" | "ready" | "failed"
  /** processing 时为 0-100 的百分比，ready 时为 100。 */
  progress: number
  error?: string
}

interface KnowledgeBridge {
  base: {
    list: () => Promise<KnowledgeRow[]>
    create: (input: KbCreateInput) => Promise<KnowledgeRow>
    update: (id: string, input: KbUpdateInput) => Promise<KnowledgeRow>
    delete: (id: string) => Promise<void>
    detail: (id: string) => Promise<KbDetailData>
  }
  doc: {
    list: (kbId: string) => Promise<KnowledgeDocRow[]>
    /** 弹出原生文件对话框选文件，然后上传到指定知识库。 */
    upload: (kbId: string) => Promise<KnowledgeDocRow[]>
    delete: (docId: string) => Promise<void>
    retry: (docId: string) => Promise<void>
    onProgress: (listener: (event: DocProgressEvent) => void) => () => void
  }
  search: {
    query: (input: SearchInput) => Promise<SearchResult[]>
  }
  bind: {
    list: (agentId: string) => Promise<KnowledgeRow[]>
    set: (agentId: string, kbIds: string[]) => Promise<void>
  }
}
```

`doc.upload` 内部由主进程弹出原生文件对话框（同 agent 的 `avatar.pick` 模式），renderer 不需要传文件路径。

### 6.3 service.ts 核心函数

**知识库 CRUD**：

- `listKnowledges()` — 查 SQLite，返回列表
- `createKnowledge(input)` — 插入 SQLite + LanceDB 预建空 schema
- `deleteKnowledge(id)` — 删 SQLite 三表 + LanceDB `delete where kb_id = id`
- `detailKnowledge(id)` — 查知识库 + 关联文档列表

**文档上传**：

- `uploadDocuments(kbId, filePaths)` — 每个文件插入 knowledge_documents（state=pending），逐个丢给 pipeline
- pipeline 异步执行，通过 `doc:progress` 事件推进度给前端

**检索**：

- `search(input)` — 调 `core/search.ts`，返回排序后的 chunk 列表

**Agent 绑定**：

- `listBindings(agentId)` — 查 agent_knowledge join knowledges
- `setBindings(agentId, kbIds)` — 事务内 delete all + batch insert

### 6.4 core/pipeline.ts 处理流程

```
filePath
  → parser.parse(filePath, format)           → 纯文本
  → chunker.split(text, options)             → chunks[]
  → embedding.embed(chunks.map(c=>c.content))  → vectors[]
  → LanceDB batch insert (chunks + vectors)
  → 更新 SQLite: doc.state = "ready", doc.chunk_count = N
  → 更新 knowledges.chunk_count / doc_count
```

每步失败 → `doc.state = "failed"` + 记录 error。pipeline 逐文档串行，对上层异步非阻塞。

### 6.5 core/chunker.ts

```ts
interface ChunkOptions {
  maxTokens?: number // 默认 512
  overlap?: number // 默认 50
}

function split(text: string, options?: ChunkOptions): Chunk[]
```

递归字符分割：按 `\n\n` → `\n` → `. ` → ` ` 逐级回退切割。自己实现，不引入 LangChain。

### 6.6 core/search.ts

```ts
interface SearchInput {
  query: string
  kbIds: string[]
  topK?: number // 默认 5
}

interface SearchResult {
  chunkId: string
  docId: string
  kbId: string
  content: string
  score: number // 归一化相似度 0-1
  metadata: string
}
```

检索流程：

1. query → `embedding.embed([query])` 得到查询向量
2. LanceDB 向量检索：`where kb_id in (kbIds)` + ANN 近似搜索，取 topK \* 2 候选
3. BM25 关键词检索：LanceDB FTS 全文匹配，取 topK \* 2 候选
4. 合并去重 + RRF（Reciprocal Rank Fusion）融合排序
5. 截取 topK 返回

### 6.7 文档解析依赖

```json
{
  "pdf-parse": "^1.x",
  "mammoth": "^1.x",
  "xlsx": "^0.x"
}
```

Markdown / TXT 原生读取，不需额外依赖。

### 6.8 SQLite 新增 repository

```
electron/db/repositories/
├── agents.ts           # 已有
├── knowledges.ts       # 新增
├── documents.ts        # 新增
└── bindings.ts         # 新增
```

和 `agentsRepo` 同模式。

## 七、前端页面

### 7.1 路由

```
/knowledge              → 知识库列表页
/knowledge/:id          → 知识库详情页
```

App.tsx 注册：

```tsx
<Route path="/knowledge" element={<KnowledgeList />} />
<Route path="/knowledge/:id" element={<KnowledgeDetail />} />
```

### 7.2 目录结构

```
app/pages/knowledge/
├── list/
│   ├── index.tsx
│   └── components/
│       ├── card.tsx               # 知识库卡片
│       └── create-dialog.tsx      # 新建对话框
├── detail/
│   ├── index.tsx
│   └── components/
│       ├── documents-tab.tsx      # 文档管理
│       ├── search-tab.tsx         # 检索测试
│       ├── settings-tab.tsx       # 知识库设置
│       └── upload-zone.tsx        # 拖拽/点击上传
├── components/
│   └── delete-dialog.tsx          # 删除确认
└── hooks/
    └── use-knowledge.ts           # 共享 CRUD hook
```

### 7.3 页面说明

**列表页** (`/knowledge`)：

- 顶部：标题 + 描述 + 新建按钮
- 主体：知识库卡片网格（名称、描述、文档数、chunk 数）
- 空状态：引导创建
- 点击卡片 → navigate 到详情

**详情页** (`/knowledge/:id`)：

- 顶部：知识库名称 + 基础信息
- 三个 tab：
  - **文档** — 文档列表 + 上传 + 处理状态实时更新（订阅 onProgress）
  - **检索测试** — 输入框 + 搜索结果（content + score + 来源文档）
  - **设置** — 编辑名称/描述、查看 embedding 模型、危险区删除

**Agent 详情页集成**：

在 `app/pages/agent/detail/components/` 新增 `knowledge-tab.tsx`：

- 展示已绑定知识库列表
- 弹出多选对话框绑定/解绑
- 调用 `window.electron.knowledge.bind.set(agentId, kbIds)`

### 7.4 现有页面处理

现有 `app/pages/knowledge/index.tsx` 和 `components/graph-view.tsx` 是 demo 壳子：

- `index.tsx` 重构为路由容器
- `graph-view.tsx` 暂时移除，后续迭代可作为 detail 页的图谱 tab 接入真实数据

### 7.5 i18n

zh-CN 和 en 同步新增：

```json
{
  "knowledge": {
    "title": "知识库",
    "description": "向量索引与文档管理",
    "create": "新建知识库",
    "upload": "上传文档",
    "emptyTitle": "知识库为空",
    "emptyDescription": "创建知识库并上传文档，构建你的私有知识",
    "tabs": {
      "documents": "文档",
      "search": "检索测试",
      "settings": "设置"
    },
    "doc": {
      "pending": "等待处理",
      "processing": "处理中",
      "ready": "就绪",
      "failed": "失败",
      "retry": "重试"
    },
    "search": {
      "placeholder": "输入查询内容...",
      "noResults": "未找到相关内容",
      "score": "相似度"
    },
    "bind": {
      "title": "关联知识库",
      "empty": "未关联任何知识库",
      "select": "选择知识库"
    },
    "delete": {
      "title": "删除知识库",
      "confirm": "确认删除知识库「{{name}}」？所有文档和向量数据将被永久删除。"
    }
  }
}
```

## 八、装配变更

### main.ts

```ts
// 新增 import
import { setupKnowledge } from "./features/knowledge/ipc"

// whenReady 内新增
setupKnowledge()

// before-quit 新增
import { closeVectorDb } from "./core/vector"
app.on("before-quit", () => {
  void closeVectorDb()
  // ...existing
})
```

### preload.ts

```ts
import { knowledgeBridge } from "./features/knowledge/bridge"

const api = {
  // ...existing
  knowledge: knowledgeBridge,
} as const
```

### renderer 调用

```ts
window.electron.knowledge.base.list()
window.electron.knowledge.doc.upload(kbId, filePaths)
window.electron.knowledge.search.query({ query, kbIds })
window.electron.knowledge.bind.set(agentId, kbIds)
```

## 九、新增依赖汇总

```json
{
  "@huggingface/transformers": "^3.x",
  "@lancedb/lancedb": "^0.x",
  "pdf-parse": "^1.x",
  "mammoth": "^1.x",
  "xlsx": "^0.x"
}
```
