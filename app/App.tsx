import Chat from "@/pages/chat"
import Demo from "@/pages/demo"
import Task from "@/pages/task"
import Agent from "@/pages/agent"
import Connect from "@/pages/connect"
import Settings from "@/pages/settings"
import Dashboard from "@/pages/dashboard"
import Knowledge from "@/pages/knowledge"
import { AnimatePresence, motion } from "motion/react"
import { Sidebar } from "@/components/layout/sidebar"
import { TitleBar } from "@/components/layout/titlebar"
import { Route, Routes, useLocation } from "react-router"
import { useThemeEffect } from "@/hooks/use-theme-effect"

function App() {
  useThemeEffect()
  // 路由切换时用 location.pathname 当 key，让 AnimatePresence 触发新旧节点的进退场
  const location = useLocation()

  return (
    <>
      <TitleBar />
      <div className="app-shell">
        <Sidebar />
        <main className="app-main">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <Routes location={location}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/agent" element={<Agent />} />
                <Route path="/task" element={<Task />} />
                <Route path="/chat" element={<Chat />} />
                <Route path="/knowledge" element={<Knowledge />} />
                <Route path="/connect" element={<Connect />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/demo" element={<Demo />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </>
  )
}

export default App
