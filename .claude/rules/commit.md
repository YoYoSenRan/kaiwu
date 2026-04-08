# Git 提交规范

风格：Conventional Commits + 中文描述。每条提交既能机器解析（type/scope）又能让人看懂（中文正文）。

## 格式

```
<type>(<scope>): <中文描述>
```

- `type`：英文小写，必填，从下表枚举里选
- `scope`：英文小写，可选，对应 feature 名 / 目录名
- 描述：中文，**首字母不大写**（中文无所谓）、**句末不加句号**
- 整行 ≤ 72 字符（中文按 1.5 算）

## type 枚举

| type | 用途 |
|---|---|
| `feat` | 新功能（用户能感知的） |
| `fix` | bug 修复 |
| `refactor` | 重构（不改外部行为） |
| `docs` | 文档（README / CLAUDE.md / 注释） |
| `style` | 格式化、空格、缺分号（无逻辑变更） |
| `test` | 加测试 / 改测试 |
| `chore` | 构建、依赖、配置（不属于上述任何一种） |
| `perf` | 性能优化 |
| `revert` | 回滚某次提交 |

**禁用**：`update` / `change` / `improve` 这类没信息量的 type。

## scope 命名

- feature 名：`scope = feature 目录名`，比如 `feat(updater): ...` `fix(deeplink): ...`
- 跨 feature 的基础设施：`scope = core` 或省略
- 渲染层：`scope = ui` / `pages` / `i18n` / `store`
- 工程：`scope = build` / `deps` / `ci`

scope 拿不准时**宁可省略**也不要瞎填。

## 描述写"为什么"，不写"做了什么"

```
✅ feat(updater): 失败自动重试避免单次网络抖动导致升级中断
✅ fix(window): macOS 关闭按钮触发 hide 而不是 quit 修复 dock 行为
✅ refactor(ipc): 移除 feature barrel 防止主进程代码污染 preload bundle

❌ feat(updater): 添加重试逻辑               // 看代码就知道
❌ fix: 修复 bug                              // 等于没写
❌ chore: update                              // 信息量为零
```

**铁律**：如果描述里没有"为什么"或"修了什么坑"，重写。

## 多行 commit message

复杂改动用多行：

```
refactor(ipc): 重命名 IPC 桥为 electron 并将 window feature 改名为 chrome

- bridge 顶层从 window.api 改为 window.electron，避免和浏览器原生 API 混淆
- features/window/ → features/chrome/，window 在 Electron 里语义太重
- 同步更新 preload、所有调用点和 d.ts
```

正文规则：

- 标题和正文之间留**一行空行**
- 每条 bullet 一行写完一件事
- 不写实现细节（"在 xx.ts 第 12 行"），那是 diff 该说的话

## 一次提交一件事

| 场景 | 处理 |
|---|---|
| 改了 A 顺手修了 B 的 bug | 拆成两个 commit |
| 重命名 + 改逻辑 | 先 `refactor` 重命名，再 `feat`/`fix` 改逻辑（git 能识别 rename） |
| 加新 feature 顺带升级依赖 | 拆成 `chore(deps)` + `feat` |
| 一堆零散格式化 + 一个真实改动 | 先 `style` 全量格式化，再做真实改动 |

**底线**：单个 commit 的 diff 看完，能用一句话讲清楚改了什么。讲不清楚就该拆。

## 禁止的提交模式

| 反模式 | 原因 |
|---|---|
| `WIP` / `wip` / `tmp` 提交进 main | 用本地 stash 或自己分支的 fixup |
| `--no-verify` 绕过 pre-commit hook | hook 失败先修问题，不要绕 |
| `--amend` 修改已经 push 的提交 | 强推会破坏共享历史 |
| commit message 里写文件路径 | git diff 已经显示 |
| 在 message 里 @某人 / 引外部链接当上下文 | 这是 PR 描述的事 |
| 一次 commit 改 20 个文件没有共同主题 | 拆 |
| 中英文混用："feat: add 新功能" | 要么全中文描述，要么全英文，不要混 |

## 紧急修复例外

线上 P0 时允许跳过部分流程，但 commit message 必须标 `[hotfix]` 前缀，事后补 follow-up commit 完善测试和文档：

```
fix(updater): [hotfix] 回滚 1.2.3 的签名校验，旧版客户端无法升级
```

## 与 changelog 的关系

提交规范是 changelog 的输入，但**项目暂不自动生成 changelog**。规则的目的是让 `git log` 本身就能读，不依赖额外工具。
