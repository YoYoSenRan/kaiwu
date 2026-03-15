# TypeScript 规范

## 类型

- **禁止 `any`**，用 `unknown` + 类型收窄代替
- 优先用 `interface` 定义对象类型；union / intersection 用 `type`
- 函数返回值必须显式标注类型（除单行 arrow function 外）
- 禁止 `as any`，确实需要断言时用 `as unknown as T`

```ts
// ❌ 禁止
function getUser(id: any): any { ... }

// ✅ 正确
interface User { id: number; name: string }
function getUser(id: number): Promise<User> { ... }
```

## 空值处理

- 必须使用可选链 `?.` 访问可能为空的属性
- 必须使用空值合并 `??` 提供默认值，禁止 `||`（会错误覆盖 `0` / `false`）

```ts
// ❌ 禁止
const name = (user && user.profile && user.profile.name) || "Anonymous"

// ✅ 正确
const name = user?.profile?.name ?? "Anonymous"
```

## 泛型

- 泛型参数名有意义：`TData`、`TError`，而不是单字母 `T`（除非复用率极高的通用函数）

## 枚举

- 禁用 TypeScript `enum`，改用 `as const` 对象：

```ts
// ❌ 禁止
enum Status {
  Active,
  Inactive,
}

// ✅ 正确
const Status = { Active: "active", Inactive: "inactive" } as const
type Status = (typeof Status)[keyof typeof Status]
```
