# API 规范

- 用户操作优先用 Server Action（表单提交、投票等）
- Agent 数据接口用 Route Handler（`/api/pipeline/`）
- 所有写入接口用 Zod schema 校验请求体
- 函数命名：查询用 `getXxx`，创建用 `createXxx`，更新用 `updateXxx`
- 错误返回标准格式：`{ error: string, details?: unknown }`
- 幂等性：同一操作重复调用不产生副作用
