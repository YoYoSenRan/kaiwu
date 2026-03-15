# 命名规范

## 文件与目录

| 类型          | 规范             | 示例              |
| ------------- | ---------------- | ----------------- |
| 目录名        | `kebab-case`     | `user-profile/`   |
| 组件文件      | `PascalCase.tsx` | `UserTable.tsx`   |
| Hook 文件     | `camelCase.ts`   | `useUserTable.ts` |
| 工具函数      | `camelCase.ts`   | `formatDate.ts`   |
| 类型声明      | `camelCase.ts`   | `userTypes.ts`    |
| Server Action | `actions.ts`     | —                 |
| 数据查询      | `queries.ts`     | —                 |
| 常量文件      | `constants.ts`   | —                 |

## 代码命名

| 类型          | 规范                   | 示例             |
| ------------- | ---------------------- | ---------------- |
| 组件          | `PascalCase`           | `UserTable`      |
| Hook          | `useXxx`               | `useUserList`    |
| 常量          | `SCREAMING_SNAKE_CASE` | `MAX_PAGE_SIZE`  |
| 普通变量/函数 | `camelCase`            | `fetchUsers`     |
| 接口/类型     | `PascalCase`           | `UserListParams` |
| Zod Schema    | `XxxSchema`            | `UserSchema`     |

## 服务端函数命名（queries.ts / actions.ts）

查询函数（Server Component 调用）：

```ts
// ✅ 直接、语义化
export async function getUsers(params: ...) { ... }
export async function getUserById(id: number) { ... }
```

变更函数（Server Action）：

```ts
// ✅ 动词 + 名词，清晰描述意图
export async function createUser(data: ...) { ... }
export async function updateUser(id: number, data: ...) { ... }
export async function deleteUser(id: number) { ... }
```

**不需要** `fetchXxxApi`、`getXxxService` 之类多余的后缀——函数所在的文件（`queries.ts` / `actions.ts`）已经表达了它的职责。
