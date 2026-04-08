# 注释规范

## 函数 JSDoc

**所有导出的函数**必须有 JSDoc。标准内容：

- 一句话描述（**必写**）
- `@param` 每个参数的用途（**必写**）
- `@returns` **默认不写**，TS 能推导出类型；只在返回值有特殊约定语义时才写
- `@throws` `@example` 不强制

```ts
/**
 * 注入 Content-Security-Policy 响应头。
 * 通过 HTTP 响应头比 meta 标签更安全，无法被页面脚本篡改。
 */
export function setupCSP(): void { ... }

/**
 * 包装 IPC handler，统一捕获异常并记录日志。
 * @param name handler 名称，用于日志标识
 * @param fn 实际的 handler 实现
 */
export function safeHandler(name: string, fn: Fn) { ... }

/**
 * 订阅进度事件。
 * @param listener 进度回调
 * @returns 取消订阅函数
 */
onProgress(listener: ProgressListener): () => void
```

行为反直觉或有调用约束时允许加第二行：

```ts
/**
 * 下载更新包，失败自动重试。
 * 必须先调用 check() 且返回非 null，否则会抛错。
 */
async download(): Promise<void>
```

## 类型 / 接口

**不强制 JSDoc**。字段含义不明显时用行内 `//` 注释：

```ts
// ✅ 字段名清晰，不用注释
export interface Progress {
  percent: number
  bytesPerSecond: number
}

// ✅ 含义不明显时行内注释
export interface UpdateInfo {
  version: string
  notes: string  // markdown 格式，可能为空
}
```

## 文件头

**不写** `@file` `@description` 类型的文件头注释。文件名 + 目录结构已经说明职责。

## 行内注释

**逻辑处必写**，解释"为什么"不是"做什么"。

✅ 好注释：
```ts
// macOS 上 dock 图标点击会触发 activate，需要重新创建窗口
app.on("activate", () => { ... })

// electron-updater 在无更新时仍返回当前版本，需手动比对
if (!result || result.updateInfo.version === autoUpdater.currentVersion.version) { ... }
```

❌ 烂注释：
```ts
// 创建窗口
createWindow()

// i 加 1
i++
```

**必须加注释的位置**：
- magic number（`setTimeout(fn, 3000)` → 解释 3000 怎么来的）
- 看起来"多此一举"的代码（解释为什么不能删）
- hack / workaround（解释绕的是什么坑，最好附 issue 链接）
- 跨进程通信边界
- 平台差异分支（`if (process.platform === "darwin")`）
