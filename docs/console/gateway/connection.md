# Gateway 连接设计

## 概述

Console 通过 WebSocket 连接本机或远程的 OpenClaw Gateway，获取 Agent 实时状态、执行日志、心跳等数据。

## 连接参数

| 参数        | 说明             | 示例                   |
| ----------- | ---------------- | ---------------------- |
| Gateway URL | WebSocket 地址   | `ws://127.0.0.1:18789` |
| Token       | Gateway 认证令牌 | `615aef524730e574...`  |
| Protocol    | Gateway 协议版本 | v3                     |

## 首次连接流程

```
用户首次打开 Console
  │
  ├── 检查 localStorage 是否有缓存的 Gateway 凭据
  │     │
  │     ├── 有 → 尝试自动连接
  │     │         │
  │     │         ├── 成功 → 进入 Dashboard
  │     │         └── 失败 → 清除缓存，跳转引导页
  │     │
  │     └── 无 → 跳转引导页
  │
  引导页（/setup）
  │
  ├── 1. 输入 Gateway 地址（默认 ws://127.0.0.1:18789）
  ├── 2. 输入 Token
  ├── 3. 点击「连接」
  │
  ├── 连接成功
  │     ├── 缓存凭据到 localStorage
  │     ├── 缓存设备标识（deviceToken）
  │     └── 跳转 Dashboard
  │
  └── 连接失败
        └── 显示错误信息（Token 无效 / 地址不可达 / 来源被拒）
```

## WebSocket 握手协议

参考 OpenClaw Gateway v3 协议：

### 1. 建立 WebSocket 连接

```
ws://127.0.0.1:18789
```

URL 规范化规则：

- 本地地址（127.0.0.1、localhost、::1）→ `ws://`（不加密）
- 远程地址 + HTTPS 页面 → `wss://`
- 默认端口：18789

### 2. Gateway 发送 Challenge

```json
{ "type": "event", "method": "connect.challenge", "params": { "nonce": "<random>" } }
```

### 3. Console 回应握手

```json
{
  "type": "req",
  "method": "connect",
  "id": "kaiwu-<seq>",
  "params": {
    "minProtocol": 3,
    "maxProtocol": 3,
    "client": { "id": "kaiwu-console", "displayName": "Kaiwu Console", "version": "0.1.0", "platform": "web", "mode": "ui", "instanceId": "kaiwu-<timestamp>" },
    "role": "operator",
    "scopes": ["operator.admin"],
    "caps": ["tool-events"],
    "auth": { "token": "<gateway_token>" },
    "deviceToken": "<cached_or_null>"
  }
}
```

### 4. Gateway 确认

成功：

```json
{ "type": "res", "id": "kaiwu-<seq>", "result": { "deviceToken": "<new_token>", "protocol": 3 } }
```

失败：

```json
{ "type": "res", "id": "kaiwu-<seq>", "error": { "code": "AUTH_TOKEN_MISMATCH", "message": "..." } }
```

## 心跳机制

- 每 30 秒发送 ping
- 连续 3 次未收到 pong → 判定断线
- 触发自动重连

## 重连策略

- 指数退避：`base × 1.7^attempt`，上限 15 秒
- 最多重试 10 次
- 不可恢复的错误（Token 无效、来源被拒）→ 停止重连，提示用户重新认证

## 错误码

| 错误码                | 说明           | 处理方式                            |
| --------------------- | -------------- | ----------------------------------- |
| `AUTH_TOKEN_MISSING`  | 未提供 Token   | 跳转引导页                          |
| `AUTH_TOKEN_MISMATCH` | Token 不匹配   | 清除缓存，跳转引导页                |
| `AUTH_RATE_LIMITED`   | 认证频率过高   | 等待后重试                          |
| `ORIGIN_NOT_ALLOWED`  | 来源域名未授权 | 提示用户配置 Gateway allowedOrigins |

## 凭据缓存

存储在 localStorage：

| Key                     | 说明                   |
| ----------------------- | ---------------------- |
| `kaiwu-gw-url`          | Gateway WebSocket 地址 |
| `kaiwu-gw-token`        | 认证 Token             |
| `kaiwu-gw-device-token` | Gateway 返回的设备令牌 |

## Gateway 实时事件

详见 [gateway/events.md](./events.md)。
