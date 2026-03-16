# 操作与错误 — Agent 管理

## 保存 Workspace 文件

| 项     | 说明                                                                   |
| ------ | ---------------------------------------------------------------------- |
| Action | `saveAgentFile(formData: FormData)`                                    |
| 入参   | `agentId: string`, `filename: string`, `content: string`（Zod 校验）   |
| 返回   | `{ success: boolean; error?: string }`                                 |
| 步骤   | 1. 校验文件名在允许列表内 → 2. 写入 workspace 文件 → 3. revalidatePath |

## 切换 Agent 启用/禁用

| 项     | 说明                                                                       |
| ------ | -------------------------------------------------------------------------- |
| Action | `toggleAgent(formData: FormData)`                                          |
| 入参   | `agentId: string`, `isEnabled: boolean`（Zod 校验）                        |
| 返回   | `{ success: boolean; error?: string }`                                     |
| 步骤   | 1. 更新 DB agents.is_enabled → 2. 同步到 openclaw.json → 3. revalidatePath |

## 修改 Agent 模型

| 项     | 说明                                                                     |
| ------ | ------------------------------------------------------------------------ |
| Action | `updateAgentModel(formData: FormData)`                                   |
| 入参   | `agentId: string`, `model: string`（Zod 校验）                           |
| 返回   | `{ success: boolean; error?: string }`                                   |
| 步骤   | 1. 写入 openclaw.json → 2. 重启 Gateway → 3. 更新 DB → 4. revalidatePath |

## 失败场景

| 场景                   | 原因                   | 用户看到                                   |
| ---------------------- | ---------------------- | ------------------------------------------ |
| 文件写入失败           | 文件权限或磁盘空间不足 | "无法写入文件，请检查文件权限"             |
| 文件名不在允许列表     | 非法文件名             | "不支持编辑该文件"                         |
| workspace 目录不存在   | Agent 未部署           | "Agent workspace 不存在，请先部署模板"     |
| openclaw.json 写入失败 | 文件权限问题           | "无法更新 OpenClaw 配置，请检查文件权限"   |
| Gateway 重启失败       | openclaw CLI 未安装    | "Gateway 重启失败，配置已保存但需手动重启" |
| DB 更新失败            | 数据库连接异常         | "数据库更新失败，请检查数据库连接"         |
| Agent 不存在           | ID 无效                | 404 页面                                   |

## 错误边界

详情页使用 `error.tsx` 捕获未预期错误，展示错误信息和重试按钮。
