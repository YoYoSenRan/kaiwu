---
paths:
  - "test/**"
  - "**/*.test.ts"
  - "**/*.spec.ts"
---

# 测试策略

栈：`vitest`（runner + expect）+ `playwright`（驱动 Electron 和操作 DOM）。
**注意项目没装 `@playwright/test`**——`test` / `describe` / `expect` 全部从 `vitest` 导入，`playwright` 只提供 `_electron` 启动和 `locator` API。
测试目录：`test/`。

## 分层

项目现阶段**只有一层测试：E2E**。这是刻意的——Electron 项目单测主进程代码意义有限（IPC、窗口、协议都要真实环境），优先用 e2e 覆盖关键路径。

未来如果有纯逻辑函数（`app/lib/*`）变多，再引入单测层。届时规则补一条"`app/lib/**` 内新增函数必须配 `.test.ts`"。

| 层级 | 位置 | 触发 | 当前状态 |
|---|---|---|---|
| E2E | `test/*.spec.ts` | `pnpm test` | ✅ 已启用 |
| 单元 | 就近 `xxx.test.ts` | `pnpm test:unit`（未建） | ⏳ 等 `lib/` 复杂度到了再建 |
| 组件 | 不做 | — | ❌ 不做，成本高收益低 |

## 运行

```sh
pnpm test                                         # 全量 e2e（pretest 会自动 vite build --mode=test）
pnpm pretest && pnpm exec vitest run test/e2e.spec.ts -t "startup"  # 单个用例
```

**铁律**：

- 跑 e2e 前必须 `pnpm pretest`（会产出 `dist/` 和 `dist-electron/`），直接 `vitest run` 会加载不到编译产物
- **运行 e2e 前必须停掉 `pnpm dev`**：主进程有单实例锁（`requestSingleInstance()`），dev 正在跑时测试实例会被 `app.quit()`，表现为 `exitCode=0` 的"干净退出"，日志上完全看不出原因
- **Linux 平台自动跳过**（CI 里跑 Electron e2e 环境依赖太多），判断逻辑在测试文件顶部
- 禁止在测试里直接改源码文件（比如写临时 fixture 到 `app/`），所有临时产物放 `test/fixtures/` 或系统 temp 目录

## 断言 matcher 的坑（重要）

项目用 **`vitest` 跑 runner + `playwright` 做驱动**，没装 `@playwright/test`。这意味着：

| 能用 | 不能用 |
|---|---|
| `expect(x).toBe(...)` | `expect(locator).toBeVisible()` |
| `expect(x).toBeGreaterThan(...)` | `expect(locator).toHaveText(...)` |
| `expect(arr).toEqual(...)` | `expect(locator).toBeEmpty()` |
| `expect(arr).toContain(...)` | `expect(page).toHaveTitle(...)` |

右侧那些是 `@playwright/test` 的 fixture 扩展，**vitest 不认**，写了会报 `Invalid Chai property: toBeXxx`。

### 正确姿势

断言 DOM 时先用 playwright locator API 把**原始值**取出来，再用 vitest 的标准 matcher 判断：

```ts
// ❌ 错：playwright-test 专属
await expect(page.locator("#root")).not.toBeEmpty()
await expect(page.getByText("MERIDIAN")).toBeVisible()
await expect(page).toHaveTitle(/Electron/)

// ✅ 对：取值 + 标准 matcher
const childCount = await page.locator("#root > *").count()
expect(childCount).toBeGreaterThan(0)

const hit = await page.locator("text=MERIDIAN").count()
expect(hit).toBeGreaterThan(0)

const title = await page.title()
expect(title).toMatch(/Electron/)
```

等待 DOM 出现仍然可以用 playwright 的 `page.waitForSelector(...)`（那是 page 方法，不是 matcher），不受影响。

## 目录组织

现在用例少，`test/e2e.spec.ts` 单文件够用。用例多起来按下面的结构拆：

```
test/
├── e2e/                       # E2E 测试
│   ├── startup.spec.ts        # 启动 / 主窗口 / 路由初始状态（系统级冒烟）
│   ├── bridge.spec.ts         # contextBridge 暴露 / 各 feature 域完整性
│   ├── chrome.spec.ts         # 对应 electron/features/chrome/
│   ├── updater.spec.ts        # 对应 electron/features/updater/
│   ├── deeplink.spec.ts       # 对应 electron/features/deeplink/
│   └── settings.spec.ts       # 跨 feature 的集成场景（主题/语言）
├── fixtures/                  # 夹具（mock 数据、假 update server 清单等）
├── helpers/                   # 测试工具（launch / 通用断言封装）
│   └── launch.ts
├── screenshots/               # 运行产物（.gitignore）
└── output/                    # trace / log（.gitignore）
```

### 命名规则

| 规则 | 说明 |
|---|---|
| 一个 feature 一个 `.spec.ts` | 文件名和 `electron/features/<name>/` 目录名一致 |
| 系统级冒烟单独文件 | `startup.spec.ts` / `bridge.spec.ts`，不对应具体 feature |
| 跨 feature 集成场景起描述性名字 | `settings.spec.ts` / `auth-flow.spec.ts`，多词用 kebab |
| E2E 后缀 `.spec.ts`，单测后缀 `.test.ts` | 一眼区分层级 |
| 文件名遵循 `naming.md` 的小写单词规则 | 例外只有多词 kebab |

### 拆分触发条件（任一满足即动手）

1. 单文件超过 200 行（`quality.md` 的硬线）
2. 要给新 feature 加测试——顺手把原单文件按 feature 拆开，新 feature 独立成 `.spec.ts`
3. `beforeAll` 启动代码要被 ≥ 2 个文件共用——抽 `test/helpers/launch.ts`

### helpers 抽取时机

遵循 `quality.md` 的 "重复 2 次才抽" 原则。第一个 spec 里写内联启动代码是对的，第二个 spec 要写时再抽 `helpers/launch.ts`。helpers 里的函数仍然要遵循 JSDoc 规范（见 `comments.md`）。

### 产物目录与 gitignore

`test/screenshots/` `test/output/` 这类运行产物目录**必须加 `.gitignore`**。`fixtures/` 是版本化的输入数据，**必须提交**。

## 什么改动必须补/改测试

| 改动类型 | 要求 |
|---|---|
| 新增 feature（`electron/features/<name>/`） | 必须补 e2e，至少覆盖 bridge 的一条主路径 |
| 改 IPC channel 签名 | 必须同步更新 e2e |
| 改启动顺序（`main.ts` 调用链） | 跑一遍 `pnpm test`，冒烟通过才合入 |
| UI 纯视觉改动（`app/components/ui/*`） | 不强求测试 |
| 改 `app/lib/` 纯函数 | 现阶段不强求；`lib/` 变复杂后会强制 |
| 改 `app/pages/` 页面布局 | 不强求 |
| 改 persistence schema（`stores/` 加字段或加 migrate） | 必须手测 migrate 路径（旧数据 → 新版本） |

## 测试编写规范

### 一个用例只测一件事

```ts
// ✅ 好
test("startup: 主窗口能正常创建", async () => { ... })
test("startup: window.electron API 挂载成功", async () => { ... })

// ❌ 坏
test("startup", async () => {
  // 测了窗口 + IPC + deeplink + 主题
})
```

### 命名：`<feature>: <要验证的事>`

冒号前是 feature 名（对应 `electron/features/<name>/` 或 `app/pages/<name>/`），冒号后是用自然语言描述的断言，可用中文。

### 禁止 sleep / 固定延时

用 playwright 的 `waitFor` / `expect().toHaveText()` 等带轮询的断言，不要 `setTimeout(3000)`。

```ts
// ✅
await expect(page.locator("#root")).toBeVisible()

// ❌
await new Promise((r) => setTimeout(r, 3000))
```

### 清理

- 每个 `test` 结束必须 `app.close()`（放 `afterEach` 或 `finally`）
- 测试产物（截图、trace）落到 `test/output/`，**加到 `.gitignore`**
- 禁止测试污染用户目录（`app.getPath("userData")` 在测试模式要指向 temp）

## 什么时候 OK 跳过测试

- 改 README / 注释 / 纯格式
- 改 `CLAUDE.md` 或 `.claude/rules/*`
- 改 `.vscode/` / `.editorconfig`
- 纯重命名（git 能识别 rename 的那种）

这种情况 commit 里直接写清楚"无运行时改动"，review 时可以豁免跑 `pnpm test`。

## 反模式

| 反模式 | 原因 |
|---|---|
| 在测试里 mock electron 模块 | e2e 的意义就是跑真环境，mock 了还不如删 |
| 用 `console.log` 调试留在测试代码里 | 提交前清理 |
| 测试依赖外网（真实下载更新包） | 网络不稳 → flaky 测试 |
| 一个 `test()` 里断言十几个点 | 失败定位困难，拆开 |
| 跳过失败测试用 `test.skip` 不加注释 | 必须写明 skip 的原因和 issue 链接 |
| 给 `pnpm test` 加 `--no-verify` 绕过 pre-commit | 根本没测试等于白费 |
