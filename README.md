# Kaiwu

Kaiwu 是一个基于 Electron + React 的桌面端智能体工作台，用来统一管理本地智能体、知识库、对话会话，以及 OpenClaw gateway / 插件桥接。

它不是通用模板项目。现在这套代码的目标很明确：把「智能体配置」「知识库检索」「多轮对话」「本地插件联动」这些能力收进一个桌面应用里。

## 当前能力

- 智能体管理：创建、同步、删除、查看详情、维护工作区文件
- 对话会话：创建会话、查看消息流、展示工具调用事件
- 知识库：创建知识库、上传文档、切块、检索、图谱视图
- 连接中心：检测并连接本机 gateway，管理 Kaiwu 插件桥接
- 设置中心：主题外观、向量嵌入配置、应用信息

## 技术栈

| 分类     | 技术                                     |
| -------- | ---------------------------------------- |
| 桌面壳   | Electron 41                              |
| 前端     | React 19、TypeScript、React Router       |
| 构建     | Vite 6、vite-plugin-electron             |
| UI       | shadcn/ui、Tailwind CSS v4、Lucide Icons |
| 状态管理 | zustand                                  |
| 数据存储 | better-sqlite3、Drizzle ORM              |
| 向量检索 | LanceDB、Transformers.js                 |
| 国际化   | i18next、react-i18next                   |
| 测试     | Vitest、Playwright                       |

## 项目结构

```text
.
├── app/                    渲染进程（React 页面、组件、状态）
├── electron/               主进程、IPC、数据库、embedding、OpenClaw 集成
├── plugins/kaiwu/          Kaiwu 的 OpenClaw 插件
├── public/                 静态资源
├── scripts/                本地开发脚本
├── test/                   测试
└── docs/                   项目文档
```

更细一点：

- `app/pages/agent`：智能体列表与详情页
- `app/pages/chat`：会话、消息、工具调用面板
- `app/pages/knowledge`：知识库列表、详情、搜索、图谱
- `app/pages/connect`：gateway 连接与插件桥接诊断
- `electron/features`：按业务拆分的 IPC 与服务层
- `electron/openclaw`：和 OpenClaw / gateway / 插件生命周期相关的桥接逻辑

## 开发环境

建议使用：

- Node.js 20+
- pnpm 10+
- macOS 开发环境（仓库当前对 Electron 桌面端和本地插件联动的适配以桌面系统为主）

如果你要用到知识库本地向量化或 OpenClaw 联动，还需要准备对应运行环境；单纯跑前端界面不一定需要先把整套外部依赖都配齐。

## 快速开始

```bash
pnpm install
pnpm dev
```

开发模式会启动 Vite，并由 Electron 加载渲染进程页面。

## 常用命令

```bash
pnpm dev          # 启动开发环境
pnpm build        # TypeScript 检查 + Vite 构建 + Electron 打包
pnpm test         # 运行 Vitest
pnpm lint:check   # 只检查，不自动修复
pnpm lint         # 执行 ESLint 并自动修复
pnpm format       # 执行 Prettier
pnpm plugin:dev   # 开发模式同步本地插件
pnpm plugin:sync  # 单次同步插件到目标目录
pnpm plugin:check # 检查插件同步状态
pnpm db:generate  # 生成 Drizzle migration
```

## 构建产物

```bash
pnpm build
```

构建完成后会生成：

- `dist/`：渲染进程产物
- `dist-electron/`：主进程产物
- `release/`：Electron Builder 打包产物

## 和 OpenClaw 的关系

这个仓库内置了一份 `plugins/kaiwu` 插件源码，用来把 Kaiwu 桌面端和 OpenClaw 运行时桥接起来。连接页里的插件检测、安装、卸载、重启，本质上就是围绕这套桥接能力在工作。

如果你只想改 UI，可以暂时不碰这部分。  
如果你要联调整个链路，就需要同时关注：

- 桌面端 `electron/openclaw/*`
- 插件端 `plugins/kaiwu/*`
- 连接页 `app/pages/connect/*`

## 状态说明

当前仓库里有些页面已经接了真实数据流，比如智能体、聊天、知识库、连接；也有些模块还处于空态占位，比如仪表盘统计和任务页。这个 README 会按“现在已经存在的能力”来写，不把未来规划混进去。

## License

[MIT](./LICENSE)
