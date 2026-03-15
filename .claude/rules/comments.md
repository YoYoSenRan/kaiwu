# 注释规范

## 文件头注释（可选）

复杂文件（>100行）顶部加简短说明：

```ts
/**
 * 用户列表页的数据查询逻辑
 * 包含分页、搜索、状态筛选
 */
```

## 函数注释

- **公共函数**（utils、lib、共享 hooks）必须加 JSDoc
- **私有函数/组件内函数** 不需要 JSDoc，用行内注释说明意图即可

```ts
// ✅ 公共工具函数必须 JSDoc
/**
 * 格式化日期为 YYYY-MM-DD
 * @param date 要格式化的日期
 */
export function formatDate(date: Date): string { ... }

// ✅ 复杂逻辑加 Why 注释
// Why: 后端返回的 status 是字符串，需要手动映射到枚举值
const status = STATUS_MAP[raw.status] ?? 'unknown'
```

## 禁止事项

- **禁止注释掉的死代码**：直接删除，git 可以找回历史
- **禁止无意义注释**：`// 获取用户列表`（代码本身已经表达了）
- **禁止 TODO 注释**：要做就做，不做就在 issue 中记录
