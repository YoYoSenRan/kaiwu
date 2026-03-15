# users — 用户表

## 所属分组

身份与访问

## 职责

Console 管理后台的登录用户。当前场景为单用户（一人公司），但预留多用户能力。

## 字段

| 字段            | 类型      | 约束                      | 说明                      |
| --------------- | --------- | ------------------------- | ------------------------- |
| `id`            | serial    | PK                        | 自增主键                  |
| `username`      | text      | NOT NULL, UNIQUE          | 登录用户名                |
| `password_hash` | text      | NOT NULL                  | 密码哈希（bcrypt/argon2） |
| `display_name`  | text      |                           | 显示名称                  |
| `role`          | text      | NOT NULL, DEFAULT 'admin' | 角色：`admin` / `viewer`  |
| `is_active`     | boolean   | NOT NULL, DEFAULT true    | 是否启用                  |
| `created_at`    | timestamp | NOT NULL, DEFAULT now()   | 创建时间                  |
| `updated_at`    | timestamp | NOT NULL, DEFAULT now()   | 更新时间                  |

## 索引

| 名称                    | 字段       | 类型   |
| ----------------------- | ---------- | ------ |
| `users_username_unique` | `username` | UNIQUE |

## 关联

- `sessions.user_id` → `users.id`

## 备注

- 密码哈希禁止明文存储
- 当前只需 `admin` 角色，`viewer` 预留给未来只读访客
- `is_active` 用于软禁用账户，不做物理删除
