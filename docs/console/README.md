# Console 设计文档索引

Kaiwu Console 是多智能体协作系统的管理界面，连接 OpenClaw Gateway，提供生产流程可视化、Agent 监控、成本追踪等能力。

## 设计原则

- **通用化**：不硬绑任何模板（三省六部等），所有 Pipeline 阶段名、Agent 角色名、flavor 文案均数据驱动
- **移动优先**：所有 UI 设计优先考虑移动端，桌面端扩展
- **实时感知**：通过 WebSocket 连接 OpenClaw Gateway，SSE 推送 DB 变更，保持数据鲜活

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

| 文档                                                               | 模块              | 阶段   |
| ------------------------------------------------------------------ | ----------------- | ------ |
| [features/01-dashboard.md](./features/01-dashboard.md)             | Dashboard 首页    | 第一期 |
| [features/02-openclaw-status.md](./features/02-openclaw-status.md) | OpenClaw 状态面板 | 第一期 |
| [features/03-productions.md](./features/03-productions.md)         | 生产看板 + 详情页 | 第一期 |
| [features/04-agents.md](./features/04-agents.md)                   | Agent 管理        | 第一期 |
| [features/05-templates.md](./features/05-templates.md)             | 模板管理          | 第二期 |
| [features/06-costs.md](./features/06-costs.md)                     | 成本追踪          | 第三期 |
| [features/07-events.md](./features/07-events.md)                   | 事件日志          | 第三期 |
