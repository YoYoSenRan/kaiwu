# 页面规范

- 默认 Server Component，需要交互时才加 `"use client"`
- page.tsx 控制在 80 行以内，业务逻辑抽到同目录的 components/
- 数据获取用 Server Component 直接查询，不用 useEffect + fetch
- URL 状态用 searchParams 驱动（筛选、分页、排序）
- 每个 page.tsx 导出 metadata（title、description）
- 动态路由用 `[id]` 目录，参数类型用 `params: Promise<{ id: string }>`
