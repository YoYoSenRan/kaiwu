# 文档规范

## 功能模块文档

新增或修改功能模块时，必须同步维护 `docs/console/features/` 下的设计文档。

### 必须包含的章节

| 章节           | 内容                                                                           |
| -------------- | ------------------------------------------------------------------------------ |
| **概述**       | 一句话定位 + 路由列表（README.md）                                             |
| **流程**       | 核心业务流程图 + 数据流向 + 关键约束（flow.md）；无复杂流程的模块可省略        |
| **UI 设计**    | ASCII 线框图 + 交互状态（空/加载/错误/成功/首次使用）+ 响应式断点差异（ui.md） |
| **组件设计**   | 组件树 + 文件结构 + Server/Client 标注 + 关键 props interface（components.md） |
| **数据与状态** | 数据源（DB / Gateway）+ 关键类型 + 状态归属（data.md）                         |
| **操作与错误** | Server Action 签名 + 失败场景表（actions.md）；无写操作的模块只写错误边界      |
| **权限**       | 当前默认值 + 未来团队场景预留（permissions.md）                                |

### 规则

- 新增模块前先写文档，文档通过审核后再编码
- 每个模块一个目录：`docs/console/features/{module-name}/`（kebab-case）
- 目录下按章节拆文件：`README.md`、`flow.md`（可选）、`ui.md`、`components.md`、`data.md`、`actions.md`、`permissions.md`
- 线框图用 ASCII 绘制，不用外部工具
- 查询代码和 Action 代码给出完整签名和类型，不写伪代码
- 文档路径索引维护在 `docs/console/README.md`

## 架构/基础设施文档

Gateway 连接、Layout、数据流等基础设施文档放在对应子目录：

```
docs/console/
├── architecture/     技术选型、数据流、目录结构
├── gateway/          WebSocket 连接、事件协议
├── layout/           响应式布局、导航结构
└── features/         功能模块（按编号排序）
```

修改基础设施代码时同步更新对应文档。
