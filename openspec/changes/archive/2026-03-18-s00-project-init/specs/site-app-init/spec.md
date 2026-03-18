## ADDED Requirements

### Requirement: Next.js 应用可启动

`apps/site` SHALL 是一个可运行的 Next.js 16 应用，使用 App Router 和 TypeScript strict mode。

#### Scenario: 开发服务器启动
- **WHEN** 执行 `pnpm dev:site`
- **THEN** Next.js 开发服务器在 localhost:3000 启动，浏览器可访问

#### Scenario: 构建成功
- **WHEN** 执行 `pnpm build --filter=@kaiwu/site`
- **THEN** Next.js 构建成功，产出 .next/ 目录

### Requirement: UnoCSS 集成

apps/site SHALL 使用 UnoCSS（preset-wind）作为 CSS 引擎，兼容 Tailwind 类名语法。

配置文件：`apps/site/uno.config.ts`

#### Scenario: UnoCSS 类名生效
- **WHEN** 在组件中使用 `className="text-red-500 p-4"`
- **THEN** 对应的 CSS 样式在页面上正确渲染

### Requirement: shadcn/ui 初始化

apps/site SHALL 完成 shadcn/ui 初始化，基础组件可按需添加。

#### Scenario: shadcn 组件可添加
- **WHEN** 执行 `npx shadcn@latest add button`
- **THEN** Button 组件被添加到 `src/components/ui/button.tsx`，可正常导入使用

### Requirement: workspace 依赖可用

apps/site SHALL 可以导入 workspace 内的其他 package。

#### Scenario: 导入 @kaiwu/db
- **WHEN** 在 apps/site 的代码中写 `import {} from "@kaiwu/db"`
- **THEN** TypeScript 编译通过，模块可解析
