import Chat from "@/pages/chat"
import Task from "@/pages/task"
import Connect from "@/pages/connect"
import Settings from "@/pages/settings"
import Dashboard from "@/pages/dashboard"
import Knowledge from "@/pages/knowledge"
import AgentList from "@/pages/agent/list"
import AgentDetail from "@/pages/agent/detail"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
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

  // bootstrap: 应用启动后自动扫描本机 gateway。主进程 startGatewayConnection 自身幂等。
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
            <main className="flex-1 overflow-y-auto">
              <div className="mx-auto max-w-6xl px-6 py-8">
                <AnimatePresence mode="wait">
                  <motion.div key={location.pathname} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15, ease: "easeOut" }}>
                    <Routes location={location}>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/agent" element={<AgentList />} />
                      <Route path="/agent/:id" element={<AgentDetail />} />
                      <Route path="/task" element={<Task />} />
                      <Route path="/chat" element={<Chat />} />
                      <Route path="/knowledge" element={<Knowledge />} />
                      <Route path="/connect" element={<Connect />} />
                      <Route path="/settings" element={<Settings />} />
                    </Routes>
                  </motion.div>
                </AnimatePresence>
              </div>
            </main>
            <Footer />
          </SidebarInset>
        </SidebarProvider>
      </div>
    </TooltipProvider>
  )
}

export default App
