# Console 设计文档索引

Kaiwu Console 是多智能体协作系统的管理界面，连接 OpenClaw Gateway，提供生产流程可视化、Agent 监控、成本追踪等能力。

## 设计原则

- **通用化**：不硬绑任何模板（三省六部等），所有 Pipeline 阶段名、Agent 角色名、flavor 文案均数据驱动
- **移动优先**：所有 UI 设计优先考虑移动端，桌面端扩展
- **实时感知**：通过 WebSocket 连接 OpenClaw Gateway，SSE 推送 DB 变更，保持数据鲜活

## 模块文档规范

所有功能模块文档统一使用以下结构，确保设计完整性和一致性：

| 章节           | 内容                            | 说明                                                                                                            |
| -------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **概述**       | 定位 + 路由                     | 一句话说清模块职责，列出所有路由                                                                                |
| **UI 设计**    | 线框图 + 交互状态 + 响应式      | ASCII 线框图描述页面结构；覆盖空状态、加载中、错误、成功等关键状态；标注各断点下的布局差异                      |
| **组件设计**   | 组件树 + 文件结构 + 接口        | 标注每个组件的 Server/Client 类型；定义关键组件的 props interface                                               |
| **数据与状态** | 数据源 + 查询 + 状态归属        | 说明数据来自 DB 还是 Gateway；给出查询代码；明确状态放在 URL searchParams / Zustand store / 组件 state 的哪一层 |
| **操作与错误** | Server Action + 校验 + 失败处理 | 定义 Action 签名和 Zod 校验；列出每个操作的失败场景和用户看到的提示；无写操作的模块只写错误边界                 |

## 架构

| 文档                                                                         | 说明                       |
| ---------------------------------------------------------------------------- | -------------------------- |
| [architecture/data-flow.md](./architecture/data-flow.md)                     | 数据流、获取策略、状态分层 |
| [architecture/tech-decisions.md](./architecture/tech-decisions.md)           | 技术选型与关键决策         |
| [architecture/directory-structure.md](./architecture/directory-structure.md) | 目录结构与文件命名约定     |

## Gateway

| 文档                                             | 说明                                       |
| ------------------------------------------------ | ------------------------------------------ |
| [gateway/connection.md](./gateway/connection.md) | WebSocket 连接、握手协议、重连策略、错误码 |
| [gateway/events.md](./gateway/events.md)         | 实时事件类型、帧格式、Store 处理逻辑       |

## 布局

| 文档                                           | 说明                                   |
| ---------------------------------------------- | -------------------------------------- |
| [layout/responsive.md](./layout/responsive.md) | 整体结构、响应式断点、配色方案         |
| [layout/navigation.md](./layout/navigation.md) | 导航分组、Header、Bottom Nav、组件文件 |

## 功能模块

| 文档                                                         | 模块              | 阶段   | 格式             |
| ------------------------------------------------------------ | ----------------- | ------ | ---------------- |
| [features/dashboard.md](./features/dashboard.md)             | Dashboard 首页    | 第一期 | 单文件（待重构） |
| [features/openclaw-status.md](./features/openclaw-status.md) | OpenClaw 状态面板 | 第一期 | 单文件（待重构） |
| [features/productions.md](./features/productions.md)         | 生产看板 + 详情页 | 第一期 | 单文件（待重构） |
| [features/agents/](./features/agents/)                       | Agent 管理        | 第一期 | ✅ 标准目录结构  |
| [features/templates/](./features/templates/)                 | 模板管理          | 第二期 | ✅ 标准目录结构  |
| [features/costs.md](./features/costs.md)                     | 成本追踪          | 第三期 | 单文件（待重构） |
| [features/events.md](./features/events.md)                   | 事件日志          | 第三期 | 单文件（待重构） |
