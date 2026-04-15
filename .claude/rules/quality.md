# 代码质量

## 规模限制

| 项目     | 上限  | 说明                                           |
| -------- | ----- | ---------------------------------------------- |
| 函数行数 | ≤ 40  | 超了就抽子函数                                 |
| 文件行数 | ≤ 200 | 超过时应**审视是否职责分散**，内聚高则不强制拆 |
| 嵌套深度 | ≤ 3   | 深了用 early return                            |

### 豁免清单

以下文件**不受规模限制**，原因写在表里：

| 路径                                   | 原因                            |
| -------------------------------------- | ------------------------------- |
| `app/types/auto-imports.d.ts`          | `unplugin-auto-import` 自动生成 |
| `app/components/ui/**`                 | shadcn CLI 生成，受工具控制     |
| `app/i18n/locales/*.json`              | 翻译文件，按数据量增长          |
| `pnpm-lock.yaml` / `package-lock.json` | 锁文件                          |
| `dist/` `dist-electron/` `out/`        | 构建产物                        |
| `*.test.ts` `*.spec.ts`                | 测试文件可有大量 fixture        |

新增豁免必须更新本表，禁止"心照不宣"的隐式豁免。

### 文件拆分的判断标准

行数是**提示信号**，不是拆分理由。决定是否拆分应看**内聚性是否受损**：

- **不拆**：文件 >200 行但所有代码仍服务于同一抽象层级、同一业务概念（如 `auth.ts` 围绕设备认证）
- **应拆**：文件中出现了多个独立的子域（如签名逻辑 + UI 对话框 + HTTP 路由混在同一个文件），即使未满 200 行也建议拆分

## 魔法值

禁止字符串/数字字面量散落，统一进 `constants.ts` 或 feature 的 `channels.ts`：

```ts
/** 检查更新的轮询间隔（毫秒）。1 小时一次平衡新鲜度和服务器压力。 */
export const CHECK_INTERVAL_MS = 60 * 60 * 1000

/** 下载失败后的最大重试次数。 */
export const MAX_RETRY = 3
```

## 封装原则

- 同文件内重复 2 次 → 抽局部函数
- 跨文件重复 2 次 → 抽到 feature 内工具文件
- 跨 feature 重复 → 抽到 `core/utils/`

## 函数粒度

- 单个函数只做一件事
- 函数名是动词短语（`checkUpdate` / `downloadFile`），不用 `handle` / `process` 这种万金油
- 嵌套超过 3 层时用 early return 或抽函数
- 禁止"半个抽象"：要么完整封装，要么内联，不留中间状态

## 错误处理

- 在系统边界（用户输入、外部 API、IPC）做校验
- 内部代码信任框架和上游契约，不做防御性 if
- 不添加掩盖错误的 fallback —— 错误应在最早位置暴露
- 跨进程错误必须在 main 侧记录完整堆栈（IPC 跨进程会丢堆栈）

## 命名规则

| 类型      | 规则                     | 例子                               |
| --------- | ------------------------ | ---------------------------------- |
| 文件名    | 小写 + 单个单词          | `service.ts` `bridge.ts`           |
| 目录名    | 小写 + 单个单词          | `updater/` `deeplink/`             |
| 函数名    | camelCase + 动词开头     | `createWindow` `checkUpdate`       |
| 类型/接口 | PascalCase + 名词        | `UpdateInfo` `WindowBridge`        |
| Boolean   | is/has/can/should 前缀   | `isDev` `hasUpdate` `canQuit`      |
| Hook 文件 | `use-` 前缀 + kebab-case | `use-theme-effect.ts` `use-now.ts` |

- React 组件文件名小写单词（`titlebar.tsx`），组件本身仍 PascalCase
- 样式文件与组件同名 + `.css`（`modal.tsx` + `modal.css`）
- `app/components/ui/` 是 shadcn CLI 生成的，保持工具默认，不受此规则约束

## Import 规则

- **单块不分组**，所有 import 合并成一个代码块，不用空行分隔
- **按行长度升序排序**，短的在上，长的在下
- **side-effect 导入**有严格顺序要求时保留在顶部，不参与长度排序
- 对象字面量的键也按**行长度升序**排列
- 直接 import 具体文件，**禁止 barrel**

## 注释规则

- 导出函数必须有 JSDoc（一句话描述 + `@param`）
- 行内注释解释"为什么"不是"做什么"
- 不写 `@file` `@description` 文件头注释
- magic number、hack/workaround、平台差异分支、跨进程边界**必须加注释**

## Git 提交

格式：`<type>: <中文描述>`（Conventional Commits），描述写"为什么"不写"做了什么"，整行 ≤ 72 字符。一次提交只做一件事。

## 设计原则

- **正交性**：两个正交的功能应该互不影响。改 A 导致 B 异常 = 正交性被破坏，要拆
- **迪米特法则**：只调用直接依赖对象的方法，禁止 `a.b.c.internal` 跨层访问
- **禁止重复机制互掐**：下层已有重连/轮询/缓存，上层不要再套同类型机制
- **开闭原则**：加新能力应该是新增文件 + 注册，而不是改十个现有文件
