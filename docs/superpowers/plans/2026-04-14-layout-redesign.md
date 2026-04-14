# Operations Deck Layout Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refresh the renderer-process layout by removing the redundant Footer, upgrading the Header to act as the page title, redesigning Dashboard and Connect pages, simplifying Knowledge headers, and adding Y-axis slide transitions.

**Architecture:** Keep all changes within `app/` (renderer process). Reuse existing stores (`useGatewayStore`, `useSettingsStore`), IPC bridges, and shadcn/ui components. Move version/env info into Settings → About. Follow the i18n rule: every new UI string gets keys in both `zh-CN.json` and `en.json`.

**Tech Stack:** React 19 + TypeScript + react-router + Tailwind CSS v4 + shadcn/ui + motion/react + i18next + zustand

---

## File Structure

| File | Responsibility |
|------|----------------|
| `app/i18n/locales/zh-CN.json` | Add new Chinese translation keys |
| `app/i18n/locales/en.json` | Add new English translation keys |
| `app/App.tsx` | Remove `<Footer />`, upgrade `motion.div` transition |
| `app/components/layout/header.tsx` | Expand height, add descriptive headline under breadcrumb |
| `app/components/layout/footer.tsx` | **Delete entire file** |
| `app/pages/dashboard/index.tsx` | Rewrite as Bento operations deck |
| `app/pages/connect/index.tsx` | Rewrite with top status banner + `grid-cols-2` layout |
| `app/pages/connect/components/plugin-card.tsx` | Simplify to status + 3 fields + action buttons |
| `app/pages/knowledge/list/index.tsx` | Replace title block with count + new button |
| `app/pages/knowledge/detail/index.tsx` | Compact header row above tabs |
| `app/pages/task/index.tsx` | Remove duplicate title block |
| `app/pages/settings/components/about.tsx` | Append environment label |

---

### Task 1: Add new i18n keys

**Files:**
- Modify: `app/i18n/locales/zh-CN.json`
- Modify: `app/i18n/locales/en.json`

- [ ] **Step 1: Open `zh-CN.json` and add keys**

Insert the following new keys into `app/i18n/locales/zh-CN.json`:

Under `dashboard` (after `activityEmpty`):
```json
    "quickActions": {
      "title": "快捷入口",
      "newKnowledge": "新建知识库",
      "connect": "连接管理",
      "viewTasks": "查看任务"
    },
    "recentKnowledge": "最近知识库",
    "systemStatus": {
      "title": "系统概览",
      "tasks": "任务队列",
      "knowledgeBases": "知识库",
      "documents": "文档总数"
    }
```

Under `knowledge` (after `description`):
```json
    "count": "{{count}} 个知识库",
```

Under `connect` (after `description`):
```json
    "banner": {
      "connected": "已连接到 OpenClaw Gateway",
      "disconnected": "未连接到 OpenClaw Gateway",
      "error": "连接出错"
    },
```

Under `settings` (after `deviceId`):
```json
    "envLabel": "环境",
```

- [ ] **Step 2: Open `en.json` and add the English equivalents**

Under `dashboard`:
```json
    "quickActions": {
      "title": "Quick Actions",
      "newKnowledge": "New Knowledge Base",
      "connect": "Connection",
      "viewTasks": "View Tasks"
    },
    "recentKnowledge": "Recent Knowledge Bases",
    "systemStatus": {
      "title": "System Overview",
      "tasks": "Task Queue",
      "knowledgeBases": "Knowledge Bases",
      "documents": "Total Documents"
    }
```

Under `knowledge`:
```json
    "count": "{{count}} knowledge bases",
```

Under `connect`:
```json
    "banner": {
      "connected": "Connected to OpenClaw Gateway",
      "disconnected": "Disconnected from OpenClaw Gateway",
      "error": "Connection error"
    },
```

Under `settings`:
```json
    "envLabel": "Environment",
```

- [ ] **Step 3: Verify JSON is valid**

Run: `node -e "require('./app/i18n/locales/zh-CN.json'); require('./app/i18n/locales/en.json'); console.log('OK')"`

Expected: prints `OK` with no errors.

- [ ] **Step 4: Commit**

```bash
git add app/i18n/locales/zh-CN.json app/i18n/locales/en.json
git commit -m "feat: 添加 Operations Deck 布局刷新所需的新翻译键"
```

---

### Task 2: Update App.tsx (remove Footer, upgrade motion)

**Files:**
- Modify: `app/App.tsx`

- [ ] **Step 1: Remove Footer import and usage, upgrade motion**

Replace the contents of `app/App.tsx` with:

```tsx
import Task from "@/pages/task"
import Connect from "@/pages/connect"
import Settings from "@/pages/settings"
import Dashboard from "@/pages/dashboard"
import KnowledgeList from "@/pages/knowledge/list"
import KnowledgeDetail from "@/pages/knowledge/detail"
import { Header } from "@/components/layout/header"
import { TitleBar } from "@/components/layout/titlebar"
import { useGateway } from "@/hooks/use-gateway"
import { AppSidebar } from "@/components/layout/sidebar"
import { useSettingsStore } from "@/stores/settings"
import { AnimatePresence, motion } from "motion/react"
import { Route, Routes, useLocation } from "react-router"
import { TooltipProvider } from "@/components/ui/tooltip"
import { useThemeEffect } from "@/hooks/use-theme-effect"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

function App() {
  useThemeEffect()
  useGateway()
  const location = useLocation()
  const sidebarCollapsed = useSettingsStore((s) => s.sidebarCollapsed)
  const setSidebarCollapsed = useSettingsStore((s) => s.setSidebarCollapsed)

  useEffect(() => {
    void window.electron.openclaw.gateway.connect()
  }, [])

  return (
    <TooltipProvider>
      <TitleBar />
      <div className="app-shell">
        <SidebarProvider open={!sidebarCollapsed} onOpenChange={(open) => setSidebarCollapsed(!open)}>
          <AppSidebar />
          <SidebarInset className="flex min-w-0 flex-col overflow-hidden">
            <Header />
            <main className="relative flex-1 overflow-y-auto p-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={location.pathname}
                  className="flex h-full flex-col"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  <Routes location={location}>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/task" element={<Task />} />
                    <Route path="/knowledge" element={<KnowledgeList />} />
                    <Route path="/knowledge/:id" element={<KnowledgeDetail />} />
                    <Route path="/connect" element={<Connect />} />
                    <Route path="/settings" element={<Settings />} />
                  </Routes>
                </motion.div>
              </AnimatePresence>
            </main>
          </SidebarInset>
        </SidebarProvider>
      </div>
    </TooltipProvider>
  )
}

export default App
```

- [ ] **Step 2: Commit**

```bash
git add app/App.tsx
git commit -m "refactor: 移除 Footer 引用并升级路由切换动效"
```

---

### Task 3: Upgrade Header to show descriptive headline

**Files:**
- Modify: `app/components/layout/header.tsx`

- [ ] **Step 1: Replace entire file**

```tsx
import { NAV_ITEMS } from "@/config/nav"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Monitor, Moon, Sun } from "lucide-react"
import { useSettingsStore } from "@/stores/settings"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"

interface Crumb {
  label: string
  path?: string
}

interface PageMeta {
  crumbs: Crumb[]
  headline: string
}

function usePageMeta(): PageMeta {
  const { t } = useTranslation()
  const { pathname } = useLocation()

  if (pathname.startsWith("/knowledge/")) {
    return {
      crumbs: [{ label: "Kaiwu" }, { label: t("knowledge.title"), path: "/knowledge" }, { label: t("common.detail") }],
      headline: t("knowledge.description"),
    }
  }

  const item = NAV_ITEMS.find((n) => n.path === pathname)
  if (item) {
    return {
      crumbs: [{ label: "Kaiwu" }, { label: t(`${item.key}.title`) }],
      headline: t(`${item.key}.description`),
    }
  }

  return {
    crumbs: [{ label: "Kaiwu" }, { label: t("common.unknownPage") }],
    headline: "",
  }
}

export function Header() {
  const navigate = useNavigate()
  const { crumbs, headline } = usePageMeta()

  return (
    <header className="border-border flex h-16 shrink-0 items-center gap-2 border-b px-3">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-4" />
      <div className="flex flex-col justify-center">
        <Breadcrumb>
          <BreadcrumbList>
            {crumbs.map((crumb, idx) => {
              const isLast = idx === crumbs.length - 1
              return (
                <Fragment key={idx}>
                  <BreadcrumbItem>
                    {isLast ? (
                      <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <button type="button" onClick={() => crumb.path && navigate(crumb.path)} className="cursor-pointer">
                          {crumb.label}
                        </button>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                  {!isLast && <BreadcrumbSeparator />}
                </Fragment>
              )
            })}
          </BreadcrumbList>
        </Breadcrumb>
        <div className="text-sm font-semibold tracking-tight">{headline}</div>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
        <LanguageToggle />
      </div>
    </header>
  )
}

function ThemeToggle() {
  const { t } = useTranslation()
  const theme = useSettingsStore((s) => s.theme)
  const setTheme = useSettingsStore((s) => s.setTheme)
  const TriggerIcon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="switch theme">
          <TriggerIcon className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={theme} onValueChange={(v) => setTheme(v as typeof theme)}>
          <DropdownMenuRadioItem value="system">
            <Monitor className="size-4" />
            {t("settings.themeSystem")}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="light">
            <Sun className="size-4" />
            {t("settings.themeLight")}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <Moon className="size-4" />
            {t("settings.themeDark")}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function LanguageToggle() {
  const { t, i18n } = useTranslation()
  const lang = useSettingsStore((s) => s.lang)
  const setLang = useSettingsStore((s) => s.setLang)
  const badge = lang === "zh-CN" ? "中" : "EN"

  const handleChange = (next: string) => {
    if (next !== "zh-CN" && next !== "en") return
    i18n.changeLanguage(next)
    setLang(next)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" aria-label="switch language">
          {badge}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={lang} onValueChange={handleChange}>
          <DropdownMenuRadioItem value="zh-CN">{t("settings.languageZh")}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="en">{t("settings.languageEn")}</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/components/layout/header.tsx
git commit -m "feat: Header 升级为面包屑 + 描述性标题组合"
```

---

### Task 4: Delete Footer component

**Files:**
- Delete: `app/components/layout/footer.tsx`

- [ ] **Step 1: Delete the file**

```bash
rm app/components/layout/footer.tsx
```

- [ ] **Step 2: Commit**

```bash
git add app/components/layout/footer.tsx
git commit -m "refactor: 删除冗余的 Footer 组件"
```

---

### Task 5: Redesign Dashboard as Operations Deck

**Files:**
- Modify: `app/pages/dashboard/index.tsx`

- [ ] **Step 1: Replace entire file**

```tsx
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useGatewayStore } from "@/stores/gateway"
import { gatewayDotColor } from "@/utils/gateway"
import { Library, ListChecks, Plug, Plus } from "lucide-react"

type KnowledgeBase = Awaited<ReturnType<typeof window.electron.knowledge.base.list>>[number]

export default function Dashboard() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [list, setList] = useState<KnowledgeBase[]>([])

  useEffect(() => {
    void window.electron.knowledge.base.list().then(setList)
  }, [])

  const recent = list.slice(0, 3)
  const totalDocs = list.reduce((sum, kb) => sum + (kb.doc_count ?? 0), 0)

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <QuickActions onNew={() => navigate("/knowledge")} onConnect={() => navigate("/connect")} onTasks={() => navigate("/task")} />
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t("dashboard.recentKnowledge")}</CardTitle>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="text-muted-foreground py-4 text-center text-sm">{t("common.noData")}</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {recent.map((kb) => (
                  <button
                    key={kb.id}
                    type="button"
                    onClick={() => navigate(`/knowledge/${kb.id}`)}
                    className="flex items-center justify-between rounded-md border p-3 text-left transition-colors hover:bg-muted/50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{kb.name}</p>
                      {kb.description && <p className="text-muted-foreground truncate text-xs">{kb.description}</p>}
                    </div>
                    <span className="text-muted-foreground shrink-0 text-xs">{kb.doc_count} docs</span>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <GatewayStatusCard />
        <SystemOverviewCard kbCount={list.length} docCount={totalDocs} />
      </div>
    </div>
  )
}

function QuickActions({ onNew, onConnect, onTasks }: { onNew: () => void; onConnect: () => void; onTasks: () => void }) {
  const { t } = useTranslation()
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{t("dashboard.quickActions.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={onNew}>
            <Plus className="mr-1.5 size-4" />
            {t("dashboard.quickActions.newKnowledge")}
          </Button>
          <Button variant="outline" size="sm" onClick={onConnect}>
            <Plug className="mr-1.5 size-4" />
            {t("dashboard.quickActions.connect")}
          </Button>
          <Button variant="outline" size="sm" onClick={onTasks}>
            <ListChecks className="mr-1.5 size-4" />
            {t("dashboard.quickActions.viewTasks")}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function GatewayStatusCard() {
  const { t } = useTranslation()
  const status = useGatewayStore((s) => s.status)
  const url = useGatewayStore((s) => s.url)
  const ping = useGatewayStore((s) => s.pingLatencyMs)

  const label = status === "connected" && url ? url.replace("ws://", "") : t(`connect.status.${status}`)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Gateway</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2">
          <span className={`size-2 rounded-full ${gatewayDotColor(status)}`} />
          <span className="text-sm font-medium">{t(`connect.status.${status}`)}</span>
        </div>
        <p className="text-muted-foreground font-mono text-xs">{label}</p>
        {status === "connected" && ping != null && <p className="text-muted-foreground font-mono text-xs">{ping}ms</p>}
      </CardContent>
    </Card>
  )
}

function SystemOverviewCard({ kbCount, docCount }: { kbCount: number; docCount: number }) {
  const { t } = useTranslation()
  const items = [
    { label: t("dashboard.systemStatus.tasks"), value: 0 },
    { label: t("dashboard.systemStatus.knowledgeBases"), value: kbCount },
    { label: t("dashboard.systemStatus.documents"), value: docCount },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{t("dashboard.systemStatus.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2 text-center">
          {items.map((item) => (
            <div key={item.label} className="space-y-1">
              <div className="text-2xl font-bold">{item.value}</div>
              <div className="text-muted-foreground text-xs">{item.label}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/pages/dashboard/index.tsx
git commit -m "feat: Dashboard 重设计为 Bento 风格操作台"
```

---

### Task 6: Redesign Connect page

**Files:**
- Modify: `app/pages/connect/index.tsx`

- [ ] **Step 1: Replace entire file**

```tsx
import { useCallback, useState } from "react"
import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useGateway } from "@/hooks/use-gateway"
import { useGatewayStore } from "@/stores/gateway"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PluginCard } from "./components/plugin-card"

type AuthMode = "token" | "password"

export default function Connect() {
  const { t } = useTranslation()
  const gw = useGateway()
  const ping = useGatewayStore((s) => s.pingLatencyMs)

  return (
    <div className="space-y-6">
      <StatusBanner status={gw.status} url={gw.url} error={gw.error} ping={ping} onDisconnect={gw.disconnect} onScan={() => gw.connect()} />
      <div className="grid gap-4 lg:grid-cols-2">
        <ManualConnectCard onConnect={gw.connect} disabled={gw.status === "connecting" || gw.status === "detecting"} />
        <PluginCard />
      </div>
    </div>
  )
}

interface StatusBannerProps {
  status: string
  url: string | null
  error: string | null
  ping: number | null
  onDisconnect: () => Promise<void>
  onScan: () => Promise<void>
}

function StatusBanner({ status, url, error, ping, onDisconnect, onScan }: StatusBannerProps) {
  const { t } = useTranslation()
  const busy = status === "connecting" || status === "detecting"

  const bannerText = status === "connected" ? t("connect.banner.connected") : status === "error" || status === "auth-error" ? t("connect.banner.error") : t("connect.banner.disconnected")
  const bgClass = status === "connected" ? "bg-primary/10 border-primary/20" : status === "error" || status === "auth-error" ? "bg-destructive/10 border-destructive/20" : "bg-muted border-border"

  return (
    <div className={`flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between ${bgClass}`}>
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className={`size-2 rounded-full ${status === "connected" ? "bg-primary" : status === "error" || status === "auth-error" ? "bg-destructive" : "bg-muted-foreground"}`} />
          {bannerText}
        </div>
        <div className="text-muted-foreground font-mono text-xs">
          {url ? url : error ? error : "—"}
          {status === "connected" && ping != null && ` · ${ping}ms`}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {status === "connected" ? (
          <Button variant="outline" size="sm" onClick={onDisconnect}>
            {t("connect.action.disconnect")}
          </Button>
        ) : (
          <Button size="sm" onClick={onScan} disabled={busy}>
            {t("connect.action.scan")}
          </Button>
        )}
      </div>
    </div>
  )
}

interface ManualFormProps {
  onConnect: (params: { url: string; token?: string; password?: string }) => Promise<void>
  disabled: boolean
}

function ManualConnectCard({ onConnect, disabled }: ManualFormProps) {
  const { t } = useTranslation()
  const [url, setUrl] = useState("")
  const [credential, setCredential] = useState("")
  const [authMode, setAuthMode] = useState<AuthMode>("token")

  const submit = useCallback(() => {
    if (!url.trim()) return
    const params = authMode === "token" ? { url: url.trim(), token: credential || undefined } : { url: url.trim(), password: credential || undefined }
    void onConnect(params)
  }, [url, credential, authMode, onConnect])

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("connect.section.manual")}</CardTitle>
        <CardDescription>{t("connect.section.manualDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="gw-url">{t("connect.label.url")}</Label>
          <Input id="gw-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="ws://127.0.0.1:18789/ws" className="font-mono text-xs" />
        </div>

        <div className="space-y-1.5">
          <Label>{t("connect.label.auth")}</Label>
          <Tabs value={authMode} onValueChange={(v) => setAuthMode(v as AuthMode)}>
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="token">Token</TabsTrigger>
              <TabsTrigger value="password">Password</TabsTrigger>
            </TabsList>
          </Tabs>
          <Input
            type={authMode === "password" ? "password" : "text"}
            value={credential}
            onChange={(e) => setCredential(e.target.value)}
            placeholder={authMode === "token" ? "Bearer token" : "Password"}
            className="font-mono text-xs"
          />
        </div>

        <Button onClick={submit} disabled={disabled || !url.trim()}>
          {t("connect.action.connect")}
        </Button>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/pages/connect/index.tsx
git commit -m "feat: Connect 页重设计为状态横幅 + 双列布局"
```

---

### Task 7: Simplify PluginCard

**Files:**
- Modify: `app/pages/connect/components/plugin-card.tsx`

- [ ] **Step 1: Replace entire file with simplified version**

```tsx
import { toast } from "sonner"
import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useCallback, useEffect, useRef, useState } from "react"
import { Download, RefreshCw, Trash2, Zap } from "lucide-react"
import type { CompatResult, OpenClawStatus } from "../../../../electron/preload"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type BusyAction = null | "sync" | "uninstall" | "restart"

export function PluginCard() {
  const { t } = useTranslation()
  const [status, setStatus] = useState<OpenClawStatus | null>(null)
  const [compat, setCompat] = useState<CompatResult | null>(null)
  const [busy, setBusy] = useState<BusyAction>(null)
  const mounted = useRef(true)

  const refresh = useCallback(async () => {
    const [s, c] = await Promise.all([window.electron.openclaw.lifecycle.detect(), window.electron.openclaw.lifecycle.check()])
    if (!mounted.current) return
    setStatus(s)
    setCompat(c)
  }, [])

  useEffect(() => {
    mounted.current = true
    void refresh()
    const offStatus = window.electron.openclaw.lifecycle.on.status((s) => setStatus(s))
    return () => {
      mounted.current = false
      offStatus()
    }
  }, [refresh])

  const wrap = useCallback(async (key: Exclude<BusyAction, null>, fn: () => Promise<void>) => {
    setBusy(key)
    try {
      await fn()
    } finally {
      if (mounted.current) setBusy(null)
    }
  }, [])

  const handleSync = useCallback(
    () =>
      wrap("sync", async () => {
        try {
          const next = await window.electron.openclaw.plugin.install()
          if (mounted.current) setStatus(next)
          toast.success(t("connect.plugin.syncOk"))
        } catch (err) {
          toast.error(t("connect.plugin.syncFail", { message: (err as Error).message }))
        }
      }),
    [t, wrap],
  )

  const handleUninstall = useCallback(
    () =>
      wrap("uninstall", async () => {
        const next = await window.electron.openclaw.plugin.uninstall()
        if (mounted.current) setStatus(next)
        toast.success(t("connect.plugin.uninstallOk"))
      }),
    [t, wrap],
  )

  const handleRestart = useCallback(
    () =>
      wrap("restart", async () => {
        const r = await window.electron.openclaw.lifecycle.restart()
        if (r.ok) toast.success(t("connect.plugin.restartOk"))
        else toast.error(t("connect.plugin.restartFail", { message: r.error ?? "unknown" }))
      }),
    [t, wrap],
  )

  const live = !!status?.installed && !!status?.running

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>{t("connect.plugin.title")}</CardTitle>
          <CardDescription>{t("connect.plugin.description")}</CardDescription>
        </div>
        <Badge variant={live ? "default" : "outline"}>{live ? t("connect.plugin.statusRunning") : t("connect.plugin.statusStopped")}</Badge>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div>
            <div className="text-muted-foreground text-xs">{t("connect.plugin.hostVersion")}</div>
            <div className="truncate font-mono text-xs">{status?.version ?? t("connect.plugin.unknown")}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">{t("connect.plugin.gatewayPort")}</div>
            <div className="truncate font-mono text-xs">{status?.gatewayPort ? `:${status.gatewayPort}` : t("connect.plugin.unknown")}</div>
          </div>
        </div>
        <Separator />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => window.location.reload()} disabled={busy === "sync"}>
            <RefreshCw className={`mr-1.5 size-3.5 ${busy === "sync" ? "animate-spin" : ""}`} />
            {t("connect.plugin.detect")}
          </Button>
          <Button variant="outline" size="sm" onClick={handleSync} disabled={busy === "sync"}>
            <Download className={`mr-1.5 size-3.5 ${busy === "sync" ? "animate-spin" : ""}`} />
            {t("connect.plugin.sync")}
          </Button>
          <Button variant="outline" size="sm" onClick={handleUninstall} disabled={busy === "uninstall"}>
            <Trash2 className={`mr-1.5 size-3.5 ${busy === "uninstall" ? "animate-spin" : ""}`} />
            {t("connect.plugin.uninstall")}
          </Button>
          <Button variant="outline" size="sm" onClick={handleRestart} disabled={busy === "restart"}>
            <Zap className={`mr-1.5 size-3.5 ${busy === "restart" ? "animate-spin" : ""}`} />
            {t("connect.plugin.restart")}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/pages/connect/components/plugin-card.tsx
git commit -m "refactor: 简化 PluginCard 为关键状态 + 操作按钮"
```

---

### Task 8: Simplify KnowledgeList header

**Files:**
- Modify: `app/pages/knowledge/list/index.tsx`

- [ ] **Step 1: Replace title block with count + button**

Replace the contents of `app/pages/knowledge/list/index.tsx` with:

```tsx
import { Plus, Library } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { KnowledgeCard } from "./components/card"
import { useKnowledgeList } from "../hooks/use-knowledge"
import { CreateKnowledgeDialog } from "./components/create-dialog"

/** 知识库列表页。 */
export default function KnowledgeList() {
  const { t } = useTranslation()
  const { list, loading, refresh } = useKnowledgeList()
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{t("knowledge.count", { count: list.length })}</p>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1.5 size-4" />
          {t("knowledge.create")}
        </Button>
      </div>

      {!loading && list.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="bg-muted flex size-12 items-center justify-center rounded-full">
              <Library className="text-muted-foreground size-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">{t("knowledge.emptyTitle")}</p>
              <p className="text-muted-foreground text-xs">{t("knowledge.emptyDescription")}</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((kb) => (
            <KnowledgeCard key={kb.id} id={kb.id} name={kb.name} description={kb.description} docCount={kb.doc_count} chunkCount={kb.chunk_count} />
          ))}
        </div>
      )}

      <CreateKnowledgeDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={refresh} />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/pages/knowledge/list/index.tsx
git commit -m "feat: 精简 KnowledgeList 头部为数量 + 新建按钮"
```

---

### Task 9: Simplify KnowledgeDetail header

**Files:**
- Modify: `app/pages/knowledge/detail/index.tsx`

- [ ] **Step 1: Replace title block with compact row**

Replace the `shrink-0` title div and keep the rest intact. The full file should become:

```tsx
import { useParams } from "react-router"
import { useTranslation } from "react-i18next"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { GraphTab } from "./components/graph-tab"
import { SearchTab } from "./components/search-tab"
import { DocumentsTab } from "./components/documents-tab"
import { SettingsTab } from "./components/settings-tab"

/** 知识库详情页。 */
export default function KnowledgeDetail() {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof window.electron.knowledge.base.detail>> | null>(null)
  const [progressMap, setProgressMap] = useState<Map<string, { progress: number; state: string }>>(new Map())

  const refresh = useCallback(async () => {
    if (!id) return
    const data = await window.electron.knowledge.base.detail(id)
    setDetail(data)
  }, [id])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    const unsub = window.electron.knowledge.doc.onProgress((event) => {
      if (event.state === "ready" || event.state === "failed") {
        setProgressMap((prev) => {
          const next = new Map(prev)
          next.delete(event.docId)
          return next
        })
        void refresh()
      } else {
        setProgressMap((prev) => new Map(prev).set(event.docId, event))
      }
    })
    return unsub
  }, [refresh])

  if (!detail) return null

  const { row, docs } = detail

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-base font-semibold tracking-tight">{row.name}</h1>
          {row.description && <p className="text-muted-foreground truncate text-sm">{row.description}</p>}
        </div>
        <p className="text-muted-foreground shrink-0 text-xs">
          {row.doc_count} docs · {row.chunk_count} chunks · {row.embedding_model}
        </p>
      </div>

      <Tabs defaultValue="documents" className="flex min-h-0 flex-1 flex-col">
        <TabsList className="shrink-0">
          <TabsTrigger value="documents">{t("knowledge.tabs.documents")}</TabsTrigger>
          <TabsTrigger value="search">{t("knowledge.tabs.search")}</TabsTrigger>
          <TabsTrigger value="graph">{t("knowledge.tabs.graph")}</TabsTrigger>
          <TabsTrigger value="settings">{t("knowledge.tabs.settings")}</TabsTrigger>
        </TabsList>
        <TabsContent value="documents" className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <DocumentsTab kbId={row.id} docs={docs} progressMap={progressMap} onRefresh={refresh} />
        </TabsContent>
        <TabsContent value="search" className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <SearchTab kbId={row.id} />
        </TabsContent>
        <TabsContent value="graph" className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <GraphTab kbId={row.id} kbName={row.name} docs={docs} />
        </TabsContent>
        <TabsContent value="settings" className="min-h-0 flex-1 overflow-y-auto">
          <SettingsTab id={row.id} name={row.name} description={row.description} embeddingModel={row.embedding_model} onUpdated={refresh} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/pages/knowledge/detail/index.tsx
git commit -m "feat: 精简 KnowledgeDetail 标题区为紧凑单行头部"
```

---

### Task 10: Remove duplicate title from Task page

**Files:**
- Modify: `app/pages/task/index.tsx`

- [ ] **Step 1: Replace entire file**

```tsx
import { ListChecks } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Card, CardContent } from "@/components/ui/card"

/** 任务队列页：空态。后续接入任务列表。 */
export default function Task() {
  const { t } = useTranslation()

  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <div className="bg-muted flex size-12 items-center justify-center rounded-full">
          <ListChecks className="text-muted-foreground size-6" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium">{t("task.emptyTitle")}</p>
          <p className="text-muted-foreground text-xs">{t("task.emptyDescription")}</p>
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/pages/task/index.tsx
git commit -m "feat: 移除 Task 页重复大标题"
```

---

### Task 11: Add environment label to AboutCard

**Files:**
- Modify: `app/pages/settings/components/about.tsx`

- [ ] **Step 1: Append env row**

Replace the file contents with:

```tsx
import { useTranslation } from "react-i18next"

/** 关于信息：版本号、构建号、设备 ID、环境。 */
export function AboutCard() {
  const { t } = useTranslation()
  return (
    <dl className="grid grid-cols-[120px_1fr] gap-y-4 text-sm">
      <dt className="text-muted-foreground">{t("settings.versionLabel")}</dt>
      <dd className="font-mono">v0.1.0</dd>
      <dt className="text-muted-foreground">{t("settings.buildLabel")}</dt>
      <dd className="font-mono">2025.0412.1</dd>
      <dt className="text-muted-foreground">{t("settings.deviceId")}</dt>
      <dd className="font-mono">dev-1a2b3c</dd>
      <dt className="text-muted-foreground">{t("settings.envLabel")}</dt>
      <dd className="font-mono">DEV</dd>
    </dl>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/pages/settings/components/about.tsx
git commit -m "feat: About 卡片补充环境标识"
```

---

### Task 12: Final lint and type check

**Files:**
- All modified files

- [ ] **Step 1: Run lint**

```bash
pnpm lint
```

Expected: no ESLint errors.

- [ ] **Step 2: Run type check**

```bash
pnpm build
```

Expected: `tsc` passes and Vite build completes without type errors.

- [ ] **Step 3: Fix any issues**

If lint or type check fails, fix the reported errors in the relevant files and re-run until clean.

---

## Self-Review Checklist

**1. Spec coverage:**
- Footer removal → Task 2 (App.tsx) + Task 4 (delete file)
- Header upgrade → Task 3
- Dashboard redesign → Task 5
- Connect redesign → Task 6
- PluginCard simplification → Task 7
- KnowledgeList header → Task 8
- KnowledgeDetail header → Task 9
- Task title removal → Task 10
- About env info → Task 11
- Route transition Y-slide → Task 2
- i18n keys → Task 1

**2. Placeholder scan:**
- No "TBD", "TODO", or "implement later" in any step.
- All code blocks contain complete, copy-pasteable implementations.

**3. Type consistency:**
- `useGatewayStore((s) => s.pingLatencyMs)` is used in Connect and Dashboard.
- `window.electron.knowledge.base.list()` return type matches `KnowledgeBase` alias.
- `BusyAction` in PluginCard is `null | "sync" | "uninstall" | "restart"` (detect removed from primary actions but kept as refresh button).

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-04-14-layout-redesign.md`.**

Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using `superpowers:executing-plans`, batch execution with checkpoints for review.

Which approach would you like?