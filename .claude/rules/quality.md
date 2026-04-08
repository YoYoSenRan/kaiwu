# 代码质量

## 规模限制

| 项目 | 上限 | 说明 |
|---|---|---|
| 函数行数 | ≤ 40 | 超了就抽子函数 |
| 文件行数 | ≤ 200 | 超了考虑拆分 |
| 嵌套深度 | ≤ 3 | 深了用 early return |

### 豁免清单

以下文件**不受规模限制**，原因写在表里：

| 路径 | 原因 |
|---|---|
| `app/types/auto-imports.d.ts` | `unplugin-auto-import` 自动生成 |
| `app/components/ui/**` | shadcn CLI 生成，受工具控制 |
| `app/i18n/locales/*.json` | 翻译文件，按数据量增长 |
| `pnpm-lock.yaml` / `package-lock.json` | 锁文件 |
| `dist/` `dist-electron/` `out/` | 构建产物 |
| `*.test.ts` `*.spec.ts` | 测试文件可有大量 fixture |

新增豁免必须更新本表，禁止"心照不宣"的隐式豁免。

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
