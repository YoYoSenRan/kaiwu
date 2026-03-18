## 1. 模板类型更新

- [ ] 1.1 更新 `packages/templates/src/types.ts`：StageType 改为 scout/council/architect/builder/inspector/deployer — 验收：typecheck 通过，旧值编译报错

## 2. 开物局模板创建

- [ ] 2.1 创建 `packages/templates/src/presets/kaiwu-factory/manifest.json` — 验收：结构与 Agent工作区设计/manifest.md 一致
- [ ] 2.2 创建游商 workspace 文件（youshang/SOUL.md + IDENTITY.md + TOOLS.md + HEARTBEAT.md）— 验收：内容与设计文档一致
- [ ] 2.3 创建说客 workspace 文件（shuike/）— 验收：同上
- [ ] 2.4 创建诤臣 workspace 文件（zhengchen/）— 验收：同上
- [ ] 2.5 创建掌秤 workspace 文件（zhangcheng/）— 验收：同上
- [ ] 2.6 创建画师 workspace 文件（huashi/）— 验收：同上
- [ ] 2.7 创建匠人 workspace 文件（jiangren/）— 验收：同上
- [ ] 2.8 创建试剑 workspace 文件（shijian/）— 验收：同上
- [ ] 2.9 创建鸣锣 workspace 文件（mingluo/）— 验收：同上

## 3. 模板初始化

- [ ] 3.1 执行 initializeTemplate("kaiwu-factory")，创建 8 个 workspace 目录 — 验收：~/.openclaw/workspace-{id}/ 均存在
- [ ] 3.2 校验 Agent ID 与数据库 agents 表一致 — 验收：listAgents() 返回 8 个，ID 完全匹配

## 4. 记忆目录

- [ ] 4.1 为每个 Agent 创建 MEMORY.md 和 memory/ 目录（lessons.md / patterns.md / relationships.md / domain/）— 验收：8 个 workspace 均有记忆文件结构

## 5. Cron Job 注册

- [ ] 5.1 注册"造物流更鼓"Cron（*/20 * * * *，isolated，--no-deliver）— 验收：openclaw cron list 可见
- [ ] 5.2 注册"游商巡视"Cron（0 */2 * * *，isolated，agent: youshang）— 验收：openclaw cron list 可见
- [ ] 5.3 注册"每日总结"Cron（0 23 * * *，isolated）— 验收：openclaw cron list 可见

## 6. Gateway 配置

- [ ] 6.1 关闭 Gateway 内置心跳（heartbeat.every: null）— 验收：openclaw.json 配置正确
- [ ] 6.2 配置 memory_search 混合搜索（hybrid + decay + mmr）— 验收：openclaw.json 配置正确
- [ ] 6.3 创建产出目录 ~/.openclaw/products/ — 验收：目录存在

## 7. 验证

- [ ] 7.1 执行 `openclaw doctor` 无报错
- [ ] 7.2 执行 `pnpm typecheck` 通过
