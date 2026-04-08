# electron-vite-react

Electron + Vite + React + TypeScript 桌面应用模板。

## 技术栈

| 分类     | 技术                                                  |
| -------- | ----------------------------------------------------- |
| 框架     | Electron、React 19、TypeScript                        |
| 构建     | Vite 6、vite-plugin-electron                          |
| UI       | shadcn/ui (radix-nova)、Tailwind CSS v4、Lucide Icons |
| 状态管理 | zustand                                               |
| 路由     | react-router (HashRouter)                             |
| 国际化   | i18next + react-i18next                               |
| 代码质量 | ESLint (flat config)、Prettier                        |
| 桌面能力 | electron-log、electron-store、electron-updater        |
| 测试     | Vitest、Playwright                                    |

## 快速开始

```sh
# 克隆项目
git clone https://github.com/YoYoSenRan/electron-vite-react.git
cd electron-vite-react

# 安装依赖
pnpm install

# 开发
pnpm dev

# 构建
pnpm build
```

## 目录结构

```
├── electron/                Electron 主进程 & 预加载脚本
│   ├── main/                主进程 (入口、自动更新、持久化存储)
│   └── preload/             预加载脚本 (IPC 桥接)
├── app/                     渲染进程 (React 应用)
│   ├── components/          组件 (ui/、theme-provider、update)
│   ├── i18n/                国际化配置与翻译文件
│   ├── lib/                 工具函数
│   ├── stores/              zustand 状态管理
│   ├── styles/              全局样式 (CSS 变量、主题)
│   └── types/               类型声明
├── build/                   应用图标
└── release/                 构建产物
```

## 可用脚本

| 命令            | 说明                   |
| --------------- | ---------------------- |
| `pnpm dev`      | 启动开发服务器         |
| `pnpm build`    | 类型检查 + 构建 + 打包 |
| `pnpm lint`     | ESLint 检查            |
| `pnpm lint:fix` | ESLint 自动修复        |
| `pnpm format`   | Prettier 格式化        |
| `pnpm test`     | 运行测试               |

## 添加 shadcn 组件

```sh
pnpm dlx shadcn@latest add [组件名]
```

## License

[MIT](LICENSE)
