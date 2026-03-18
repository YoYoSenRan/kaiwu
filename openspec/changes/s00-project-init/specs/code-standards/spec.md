## ADDED Requirements

### Requirement: CLAUDE.md 项目指令

项目根目录 SHALL 包含 `CLAUDE.md`，内容包括：
- 项目概览（一句话描述）
- 技术栈声明
- 常用命令（dev、build、lint、typecheck）
- 规范文件索引（指向 .claude/rules/）
- 核心约束（禁止 any、必须用 cn()、页面 < 80 行等）

#### Scenario: Claude Code 读取项目指令
- **WHEN** 在项目根目录启动 Claude Code
- **THEN** CLAUDE.md 被自动加载，Agent 了解项目技术栈和约束

### Requirement: 代码规范文件集

`.claude/rules/` 目录 SHALL 包含以下 6 个规范文件：
- `ts.md`：TypeScript 规范（禁止 any、可选链、空值合并、枚举用 as const）
- `code-names.md`：命名规范（文件 kebab-case、组件 PascalCase、常量 SCREAMING_SNAKE）
- `comments.md`：注释规范（公共函数 JSDoc、Why 注释、禁止死代码）
- `style.md`：样式规范（只用 UnoCSS、必须用 cn()、语义 token）
- `pages.md`：页面规范（Server Component 默认、page.tsx < 80 行、searchParams 驱动）
- `api.md`：API 规范（Server Action 优先、Zod 校验、函数命名 getXxx/createXxx）

#### Scenario: 规范文件完整
- **WHEN** 检查 `.claude/rules/` 目录
- **THEN** 存在 6 个 .md 文件，每个文件内容非空且与对应主题相关

#### Scenario: 规范可被 Claude Code 引用
- **WHEN** Claude Code 在编写代码时
- **THEN** 可以引用 .claude/rules/ 下的规范文件作为编码依据
