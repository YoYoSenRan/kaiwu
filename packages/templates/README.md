# @kaiwu/templates

Kaiwu 模板包。存放预设模板的静态数据（manifest + SOUL.md），并提供读取和校验能力。

## 目录结构

```
src/
├── types.ts              Manifest 类型定义 + Zod Schema
├── loader.ts             模板读取、校验、列出
├── index.ts              barrel 导出
└── presets/
    └── sansheng-liubu/   三省六部模板
        ├── manifest.json
        └── agents/
            ├── taizi/SOUL.md
            ├── zhongshu/SOUL.md
            ├── menxia/SOUL.md
            ├── shangshu/SOUL.md
            ├── hubu/SOUL.md
            ├── libu/SOUL.md
            ├── bingbu/SOUL.md
            ├── xingbu/SOUL.md
            ├── gongbu/SOUL.md
            ├── libu_hr/SOUL.md
            └── zaochao/SOUL.md
```

## API

```ts
import {
  listTemplates, // 列出所有可用模板摘要
  loadManifest, // 读取并校验指定模板的 manifest.json
  validateManifest, // Zod 校验原始数据
  readAgentSoul, // 读取指定 Agent 的 SOUL.md 内容
  validateTemplateIntegrity, // 检查模板所有 SOUL.md 是否齐全
} from "@kaiwu/templates"
```

## 添加新模板

1. 在 `src/presets/` 下创建目录，如 `src/presets/my-theme/`
2. 编写 `manifest.json`（参考 `sansheng-liubu/manifest.json`）
3. 为每个 Agent 创建 `agents/{id}/SOUL.md`
4. `listTemplates()` 会自动发现新模板

## SOUL.md 占位符

模板中的 SOUL.md 支持以下占位符，在初始化时由 `@kaiwu/openclaw` 替换：

| 占位符         | 替换为           |
| -------------- | ---------------- |
| `{{REPO_DIR}}` | 实际项目仓库路径 |
