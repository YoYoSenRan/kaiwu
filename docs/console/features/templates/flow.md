# 流程 — 模板管理

## 部署流程

```
用户点击「安装」/「重新部署」
  │
  ▼
DeployButton（Client Component）
  │  调用 Server Action
  ▼
deployTemplate(slug)
  │
  ├── 1. 校验 slug（Zod）
  │
  ├── 2. 文件系统初始化（@kaiwu/openclaw）
  │     ├── 读取 manifest.json + 校验 SOUL.md 完整性
  │     ├── 创建 ~/.openclaw/workspace-{id}/
  │     ├── 同步 agent 目录所有文件到 workspace
  │     ├── 写入 AGENTS.md（工作协议）
  │     ├── 注册到 openclaw.json（upsert agents.list）
  │     └── 重启 Gateway
  │
  ├── 3. 数据库写入（@kaiwu/db）
  │     ├── upsert themes 表
  │     ├── upsert pipelines 表
  │     ├── upsert agents 表
  │     └── 设置 is_active = true
  │
  ├── 4. revalidatePath("/templates", "/")
  │
  └── 返回结果 → DeployButton 更新 UI
```

## 数据流向

```
@kaiwu/templates              @kaiwu/openclaw              Kaiwu DB
src/presets/{slug}/            ~/.openclaw/                  PostgreSQL
├── manifest.json        ──→  ├── openclaw.json (agents)  ──→  agents 表
└── agents/{id}/*        ──→  └── workspace-{id}/              themes 表
                                   ├── SOUL.md                 pipelines 表
                                   ├── AGENTS.md
                                   └── skills/

  项目源码（静态模板）    ──→    本地运行时（执行）        ──→  数据库（查询展示）
```

## 重新部署（覆盖安装）

- workspace 中已有文件先备份（`.bak.{timestamp}`）
- openclaw.json 中已有 Agent 更新 workspace 和 allowAgents
- DB 用 upsert，不丢失已有的运行时数据

## 关键约束

- 模板是**一次性操作**——部署后日常运行不再读模板文件
- OpenClaw 运行时是 source of truth，DB 是其只读镜像
- Gateway 重启失败不回滚文件系统变更（提示用户手动重启）
