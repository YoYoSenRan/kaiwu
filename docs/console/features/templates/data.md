# 数据与状态 — 模板管理

## 数据源

| 页面   | 数据源                                            | 方式                                    |
| ------ | ------------------------------------------------- | --------------------------------------- |
| 列表页 | `@kaiwu/templates` listTemplates() + DB themes 表 | Server Component 直查                   |
| 详情页 | `@kaiwu/templates` loadManifest(slug)             | Server Component，纯文件读取，不涉及 DB |

## 关键类型

```ts
interface TemplateWithStatus {
  slug: string
  name: string
  description: string
  version: string
  agentCount: number
  isActive: boolean
}
```

详情页使用 `Manifest` 类型（定义在 `@kaiwu/templates`）。

## 状态归属

| 状态             | 存放位置                         | 说明              |
| ---------------- | -------------------------------- | ----------------- |
| 模板列表         | Server Component props           | SSR 直出          |
| 当前激活模板     | Server Component props（从 DB）  | SSR 直出          |
| 部署按钮 loading | 组件 state                       | DeployButton 内部 |
| 详情页当前 Tab   | URL searchParams `?tab=pipeline` | 可刷新、可分享    |
