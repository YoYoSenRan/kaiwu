import Task from "@/pages/task"
import Connect from "@/pages/connect"
import Settings from "@/pages/settings"
import Dashboard from "@/pages/dashboard"
import KnowledgeList from "@/pages/knowledge/list"
import KnowledgeDetail from "@/pages/knowledge/detail"
import { TitleBar } from "@/components/layout/titlebar"
import { NanoDock } from "@/components/layout/dock"
import { StatusBar } from "@/components/layout/status"
import { useGateway } from "@/hooks/use-gateway"
import { AnimatePresence, motion } from "motion/react"
import { Route, Routes, useLocation } from "react-router"
import { TooltipProvider } from "@/components/ui/tooltip"
import { useThemeEffect } from "@/hooks/use-theme-effect"
import { useEffect } from "react"

function App() {
  useThemeEffect()
  useGateway()
  const location = useLocation()

  useEffect(() => {
    void window.electron.openclaw.gateway.connect()
  }, [])

  return (
    <TooltipProvider>
      <TitleBar />
      <div className="app-shell bg-background/50 flex-col">
        <div className="flex flex-1 overflow-hidden">
          <NanoDock />
          <main className="relative flex-1 overflow-y-auto p-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                className="flex h-full flex-col"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15, ease: "easeInOut" }}
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
        </div>
        <StatusBar />
      </div>
    </TooltipProvider>
  )
}

export default App
