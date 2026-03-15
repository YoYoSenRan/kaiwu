# sessions — 登录会话表

## 所属分组

身份与访问

## 职责

管理用户登录会话，支持 Token-based 认证。

## 字段

| 字段         | 类型      | 约束                    | 说明                            |
| ------------ | --------- | ----------------------- | ------------------------------- |
| `id`         | text      | PK                      | 会话 Token（UUID 或随机字符串） |
| `user_id`    | integer   | NOT NULL, FK → users.id | 关联用户                        |
| `expires_at` | timestamp | NOT NULL                | 过期时间                        |
| `created_at` | timestamp | NOT NULL, DEFAULT now() | 创建时间                        |

## 索引

| 名称                      | 字段         | 类型   |
| ------------------------- | ------------ | ------ |
| `sessions_user_id_idx`    | `user_id`    | B-tree |
| `sessions_expires_at_idx` | `expires_at` | B-tree |

## 关联

- `sessions.user_id` → `users.id`（ON DELETE CASCADE）

## 备注

- 会话 ID 即 Token，存于 Cookie（HttpOnly, Secure）
- 过期会话由定时任务或请求时惰性清理
- 同一用户可有多个活跃会话（多设备登录）
