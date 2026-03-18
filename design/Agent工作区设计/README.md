# Agent 工作区设计（OpenClaw Workspace）

## 概述

每位局中人在 OpenClaw 中拥有独立的工作区目录 `~/.openclaw/workspace-{agentId}/`。工作区是 Agent 的"住所"——存放他的灵魂、记忆、工具说明和心跳任务。

本目录定义开物局八位局中人的 workspace 文件内容规范，供 `@kaiwu/templates` 模板包生成。

## 文档索引

| 文档                         | 内容                                                       |
| ---------------------------- | ---------------------------------------------------------- |
| [AGENTS.md](./AGENTS.md)     | 共享工作协议（所有角色统一）                               |
| [API.md](./API.md)           | Agent 数据接口：两层架构 + 安全方案 + 端点设计 + Tool 封装 |
| [MEMORY.md](./MEMORY.md)     | 成长档案初始模板                                           |
| [manifest.md](./manifest.md) | 模板包集成：manifest.json + 目录结构 + 初始化流程          |
| [游商/](./游商/)             | 游商的 SOUL.md、IDENTITY.md、TOOLS.md、HEARTBEAT.md        |
| [说客/](./说客/)             | 说客的全套 workspace 文件                                  |
| [诤臣/](./诤臣/)             | 诤臣的全套 workspace 文件                                  |
| [掌秤/](./掌秤/)             | 掌秤的全套 workspace 文件                                  |
| [画师/](./画师/)             | 画师的全套 workspace 文件                                  |
| [匠人/](./匠人/)             | 匠人的全套 workspace 文件                                  |
| [试剑/](./试剑/)             | 试剑的全套 workspace 文件                                  |
| [鸣锣/](./鸣锣/)             | 鸣锣的全套 workspace 文件                                  |

## 运行时目录结构

```
~/.openclaw/
├── workspace-youshang/       # 游商
│   ├── SOUL.md               # 灵魂：人格、语气、行为准则
│   ├── IDENTITY.md           # 身份卡：名号、形象、签名
│   ├── AGENTS.md             # 造物流工作协议（所有角色共享）
│   ├── TOOLS.md              # 可用工具与输出格式
│   ├── HEARTBEAT.md          # 心跳任务（更鼓响时做什么）
│   ├── MEMORY.md             # 长期记忆（成长档案）
│   └── memory/               # 每日日志
│       └── YYYY-MM-DD.md
├── workspace-shuike/         # 说客
├── workspace-zhengchen/      # 诤臣
├── workspace-zhangcheng/     # 掌秤
├── workspace-huashi/         # 画师
├── workspace-jiangren/       # 匠人
├── workspace-shijian/        # 试剑
└── workspace-mingluo/        # 鸣锣
```

## 文件职责总览

| 文件         | 加载时机 | 职责                         | 开物局特化               |
| ------------ | -------- | ---------------------------- | ------------------------ |
| SOUL.md      | 每次会话 | 角色人格、说话风格、行为模式 | 每个角色完全不同         |
| IDENTITY.md  | 每次会话 | 名号、emoji、形象描述        | 对应八位局中人的视觉标识 |
| AGENTS.md    | 每次会话 | 操作指令与协作规则           | 统一的造物流工作协议     |
| TOOLS.md     | 按需     | 可用工具、输出 schema        | 每个角色工具集不同       |
| HEARTBEAT.md | 更鼓响时 | 心跳触发的任务清单           | 每个角色的心跳职责不同   |
| MEMORY.md    | 主会话   | 成长档案、经验沉淀           | 属性值、教训、里程碑     |
| USER.md      | —        | **不创建**                   | 开物局无人类用户交互     |

> USER.md 在开物局场景下不适用。局中人的交互对象是编排层和其他 Agent，不是人类用户。

---

## 设计决策记录

### 为什么不用 USER.md？

开物局是全自动流水线，Agent 的交互对象是编排层和其他 Agent，不是人类用户。USER.md 的"了解你的用户"语义在这里不适用。如果 OpenClaw 框架强制加载 USER.md，留空即可。

### 跨阶段上下文怎么传递？

通过数据交互 tool。Agent 调用 `get_project_context(projectId)` 即可读取上游阶段的产出（采风报告、辩论记录、蓝图等），这些数据存在数据库的 `phases.output` JSONB 字段中。

workspace 文件是"角色的灵魂"，不是"项目的数据"。项目数据走 API，角色人格走文件。

### 属性值谁来更新？

编排层负责。每次造物令完成后，编排层根据实战数据计算属性值，更新数据库的 `agent_stats` 表，同时将属性快照写入对应 Agent 的 `MEMORY.md`。Agent 自己不修改属性星级。

### 属性如何影响行为？

通过 SOUL.md 的动态段落。编排层在调用 Agent 时，根据当前属性等级，在 SOUL.md 末尾追加行为修饰：

```markdown
## 当前状态（由编排层注入，勿手动修改）

你目前是 Lv.2 行脚期。

- 嗅觉 ★★★☆☆：你的市场判断已经比较准了，可以在报告中加入更多主观判断
- 慧眼 ★★☆☆☆：继续关注被忽略的细分市场
```

### HEARTBEAT.md 和心跳引擎的关系？

HEARTBEAT.md 是 Agent 侧的"更鼓响时做什么"指令。心跳引擎（编排层）负责定时触发，触发时 OpenClaw 会自动读取 HEARTBEAT.md 并执行。

编排层可以动态修改 HEARTBEAT.md 的内容——比如当某个项目进入过堂阶段时，编排层会更新说客和诤臣的 HEARTBEAT.md，加入"有过堂需要你发言"的指令。

### permissions 的设计逻辑？

```
游商 → 无（独立采风，不需要和其他 Agent 对话）
说客 → 诤臣（过堂中需要回应对方）
诤臣 → 说客（过堂中需要回应对方）
掌秤 → 说客、诤臣（需要引用双方论点）
画师 → 匠人（蓝图交接）
匠人 → 画师、试剑（上报蓝图问题、接收试剑反馈）
试剑 → 匠人（打回修复）
鸣锣 → 无（独立部署，只接收编排层指令）
```

过堂阶段的对话由编排层编排（轮次控制），Agent 之间的 allowAgents 主要用于异常情况下的直接沟通。
