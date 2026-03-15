# 操作与错误 — 模板管理

## 部署模板

| 项     | 说明                                                                                                                                     |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Action | `deployTemplate(formData: FormData)`                                                                                                     |
| 入参   | `slug: string`（Zod 校验）                                                                                                               |
| 返回   | `{ success: boolean; error?: string }`                                                                                                   |
| 步骤   | 1. 初始化文件系统（`@kaiwu/openclaw` initializeTemplate）→ 2. 写入 DB（upsert themes/pipelines/agents）→ 3. 标记激活 → 4. revalidatePath |

## 失败场景

| 场景                   | 原因                | 用户看到                                             |
| ---------------------- | ------------------- | ---------------------------------------------------- |
| SOUL.md 缺失           | 模板文件不完整      | "模板 xxx 缺少以下 Agent 的 SOUL.md：bingbu, xingbu" |
| openclaw.json 写入失败 | 文件权限问题        | "无法写入 OpenClaw 配置，请检查文件权限"             |
| Gateway 重启失败       | openclaw CLI 未安装 | "Gateway 重启失败，模板已部署但需要手动重启 Gateway" |
| DB 写入失败            | 数据库连接异常      | "数据库写入失败，请检查数据库连接"                   |
| manifest.json 校验失败 | 模板格式错误        | "模板清单格式错误：[Zod 错误详情]"                   |
