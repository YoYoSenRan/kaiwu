# TypeScript 规范

- 禁止 `any`，用 `unknown` + 类型守卫或 `as const` 断言
- 优先用可选链 `?.` 和空值合并 `??`
- 枚举用 `as const` 对象，不用 `enum`
- 函数返回类型显式标注（公共 API）
- 泛型参数有意义的命名（`TProject` 而非 `T`）
- `noUncheckedIndexedAccess` 已开启，数组/对象索引访问需要判空
