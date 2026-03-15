# 模板管理

列出 `@kaiwu/templates` 中所有可用模板，预览模板内容（Pipeline 阶段、Agent 列表、权限矩阵），一键初始化部署到 OpenClaw 运行时并写入数据库。

## 路由

```
/templates            → 模板列表页
/templates/[slug]     → 模板详情预览页
```

## 文档

| 文档                               | 说明                                   |
| ---------------------------------- | -------------------------------------- |
| [flow.md](./flow.md)               | 部署流程、数据流向、覆盖安装、关键约束 |
| [ui.md](./ui.md)                   | 页面线框图、交互状态、响应式           |
| [components.md](./components.md)   | 组件树、文件结构、props 接口           |
| [data.md](./data.md)               | 数据源、关键类型、状态归属             |
| [actions.md](./actions.md)         | Server Action 签名、失败场景           |
| [permissions.md](./permissions.md) | 角色权限                               |
