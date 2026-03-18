## ADDED Requirements

### Requirement: 鸣锣部署

`deployer.ts` SHALL：调用鸣锣 Agent → 构建打包 → Git push → Vercel 部署 → 冒烟测试。

#### Scenario: 部署成功
- **WHEN** 冒烟测试通过
- **THEN** 创建 products 记录，projects.status = launched，造物志生成终章

#### Scenario: 冒烟失败
- **WHEN** HTTP HEAD 返回非 200
- **THEN** 自动回滚，回退到 inspector 阶段

### Requirement: 属性计算

造物令完成后 SHALL 更新各 Agent 的属性（agent_stats 表）。

#### Scenario: 游商属性更新
- **WHEN** 造物令 launched
- **THEN** 游商的"嗅觉"属性根据采风评分 vs 最终结果更新
