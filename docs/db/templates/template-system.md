# 模板系统设计

## 核心思想

每个 theme 不只是 UI 皮肤，还自带一套完整的 **Agent 模板包**。Console 选择模板后，一键完成：

```
选择模板（三省六部）
  │
  ├── 1. 创建 Agent workspace 目录
  ├── 2. 部署 SOUL.md 到各 workspace
  ├── 3. 写入工作协议（AGENTS.md）
  ├── 4. 注册 Agent 到 openclaw.json（含权限矩阵）
  ├── 5. 写入 DB：themes + pipelines + agents
  └── 6. 重启 OpenClaw Gateway
```

## 模板目录结构

模板存在项目文件系统中，不入数据库：

```
packages/templates/templates/
├── sansheng-liubu/              ← 三省六部模板
│   ├── manifest.json            ← 模板清单（元数据 + Agent 定义 + 权限 + pipeline）
│   └── agents/
│       ├── taizi/
│       │   └── SOUL.md
│       ├── zhongshu/
│       │   └── SOUL.md
│       ├── menxia/
│       │   └── SOUL.md
│       ├── shangshu/
│       │   └── SOUL.md
│       ├── hubu/
│       │   └── SOUL.md
│       ├── libu/
│       │   └── SOUL.md
│       ├── bingbu/
│       │   └── SOUL.md
│       ├── xingbu/
│       │   └── SOUL.md
│       ├── gongbu/
│       │   └── SOUL.md
│       ├── libu_hr/
│       │   └── SOUL.md
│       └── zaochao/
│           └── SOUL.md
│
└── (future-theme)/              ← 未来的其他模板
    ├── manifest.json
    └── agents/
        └── ...
```

## manifest.json 结构

一个模板的所有配置集中在 `manifest.json` 中：

```json
{
  "slug": "sansheng-liubu",
  "name": "三省六部",
  "description": "以中国唐代三省六部制为骨架的多 Agent 协作体系",
  "version": "1.0.0",

  "theme": {
    "config": {
      "colors": { "primary": "#D4AF37", "background": "#0A0A0A", "accent": "#FFBF00" },
      "typography": { "heading": "Noto Serif SC", "body": "Inter" },
      "flavor": { "production": "圣旨", "proposal": "奏折", "approve": "准奏", "reject": "封驳", "complete": "回奏", "publish": "颁行天下" }
    }
  },

  "pipelines": [
    { "stageType": "triage", "sortOrder": 1, "label": "太子", "emoji": "🤴", "color": "#e8a040", "description": "消息分拣，判断是否值得立项" },
    { "stageType": "planning", "sortOrder": 2, "label": "中书省", "emoji": "📜", "color": "#a07aff", "description": "接旨、规划、拆解子任务" },
    { "stageType": "review", "sortOrder": 3, "label": "门下省", "emoji": "🔍", "color": "#6a9eff", "description": "审议方案，准奏或封驳" },
    { "stageType": "dispatch", "sortOrder": 4, "label": "尚书省", "emoji": "📮", "color": "#6aef9a", "description": "派发任务，协调六部" },
    { "stageType": "execute", "sortOrder": 5, "label": "六部", "emoji": "⚙️", "color": "#ff9a6a", "description": "并行实施" },
    { "stageType": "publish", "sortOrder": 6, "label": "回奏", "emoji": "✅", "color": "#2ecc8a", "description": "汇总结果，自动发布" }
  ],

  "agents": [
    { "id": "taizi", "stageType": "triage", "subRole": null },
    { "id": "zhongshu", "stageType": "planning", "subRole": null },
    { "id": "menxia", "stageType": "review", "subRole": null },
    { "id": "shangshu", "stageType": "dispatch", "subRole": null },
    { "id": "hubu", "stageType": "execute", "subRole": "data" },
    { "id": "libu", "stageType": "execute", "subRole": "doc" },
    { "id": "bingbu", "stageType": "execute", "subRole": "code" },
    { "id": "xingbu", "stageType": "execute", "subRole": "audit" },
    { "id": "gongbu", "stageType": "execute", "subRole": "infra" },
    { "id": "libu_hr", "stageType": "execute", "subRole": "hr" },
    { "id": "zaochao", "stageType": "execute", "subRole": null }
  ],

  "permissions": {
    "taizi": { "allowAgents": ["zhongshu"] },
    "zhongshu": { "allowAgents": ["menxia", "shangshu"] },
    "menxia": { "allowAgents": ["shangshu", "zhongshu"] },
    "shangshu": { "allowAgents": ["zhongshu", "menxia", "hubu", "libu", "bingbu", "xingbu", "gongbu", "libu_hr"] },
    "hubu": { "allowAgents": ["shangshu"] },
    "libu": { "allowAgents": ["shangshu"] },
    "bingbu": { "allowAgents": ["shangshu"] },
    "xingbu": { "allowAgents": ["shangshu"] },
    "gongbu": { "allowAgents": ["shangshu"] },
    "libu_hr": { "allowAgents": ["shangshu"] },
    "zaochao": { "allowAgents": [] }
  },

  "workProtocol": "1. 接到任务先回复\"已接旨\"。\n2. 输出必须包含：任务ID、结果、证据/文件路径、阻塞项。\n3. 需要协作时，回复尚书省请求转派，不跨部直连。\n4. 涉及删除/外发动作必须明确标注并等待批准。"
}
```

## 初始化流程

### Console 触发

```
Console → 选择模板 → 点击「初始化」 → 调用 Server Action
```

### Server Action 执行步骤

```
1. 读取 manifest.json
   └── 校验模板完整性（agents 和 SOUL.md 文件是否齐全）

2. 创建 workspace 目录
   └── 遍历 agents，创建 ~/.openclaw/workspace-{id}/
   └── 在每个 workspace 下创建 skills/ 子目录

3. 部署 SOUL.md
   └── 从 templates/{slug}/agents/{id}/SOUL.md
   └── 复制到 ~/.openclaw/workspace-{id}/SOUL.md
   └── 替换路径占位符（如 __REPO_DIR__）

4. 写入工作协议
   └── 从 manifest.workProtocol
   └── 写入每个 workspace 的 AGENTS.md

5. 注册到 openclaw.json
   └── 读取现有 openclaw.json
   └── 备份（.bak.{timestamp}）
   └── upsert agents.list（id、workspace、subagents.allowAgents）
   └── 写回 openclaw.json

6. 写入数据库
   └── upsert themes 表（slug、name、config）
   └── upsert pipelines 表（该 theme 的所有阶段）
   └── upsert agents 表（id、stageType、subRole）
   └── 设置该 theme 为 is_active = true

7. 重启 Gateway
   └── 执行 openclaw gateway restart
   └── 失败则回滚 openclaw.json
```

### 重新初始化（覆盖安装）

如果已有同 slug 的模板被初始化过：

- workspace 中已有文件先备份（SOUL.md.bak.{timestamp}）
- openclaw.json 中已有的 Agent 跳过注册，只更新 workspace 和 allowAgents
- 数据库 upsert，不会丢失已有的 config 等 Kaiwu 独有数据

### 卸载模板

```
1. 标记 agents 表 is_enabled = false（不物理删除）
2. 从 openclaw.json 移除 Agent 注册
3. 可选：删除 workspace 目录（需用户确认）
4. 标记 theme is_active = false
5. 重启 Gateway
```

## 与现有系统的关系

```
packages/templates/              packages/openclaw/              Kaiwu DB
templates/{slug}/                ~/.openclaw/                    PostgreSQL
├── manifest.json          ──→   ├── openclaw.json (agents) ──→  agents 表
├── agents/{id}/SOUL.md    ──→   └── workspace-{id}/             themes 表
                                     ├── SOUL.md                 pipelines 表
                                     ├── AGENTS.md
                                     └── skills/

  项目源码（模板）          ──→     本地运行时（执行）         ──→  数据库（查询）
```

**模板是一次性操作**——初始化后，日常运行不再读模板文件。OpenClaw 运行时成为 source of truth，数据库是其只读镜像。

## 代码位置

| 模块                  | 路径                                   | 职责                                                         |
| --------------------- | -------------------------------------- | ------------------------------------------------------------ |
| 模板文件              | `packages/templates/templates/{slug}/` | 静态模板存储                                                 |
| 模板读取 SDK          | `packages/templates/src/loader.ts`     | 读取 manifest、校验、列出可用模板                            |
| 初始化编排            | `packages/templates/src/setup.ts`      | 调用 openclaw SDK 完成 workspace 创建 + Agent 注册 + DB 写入 |
| OpenClaw SDK          | `packages/openclaw/src/`               | 读 openclaw.json、读 workspace 文件、调用 CLI                |
| Console Server Action | `apps/console/src/app/.../actions.ts`  | 调用 templates SDK 执行初始化                                |
