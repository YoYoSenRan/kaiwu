import Task from "@/pages/task"
import Connect from "@/pages/connect"
import Settings from "@/pages/settings"
import Dashboard from "@/pages/dashboard"
import KnowledgeList from "@/pages/knowledge/list"
import KnowledgeDetail from "@/pages/knowledge/detail"
import AgentList from "@/pages/agent/list"
import AgentDetail from "@/pages/agent/detail"
import Chat from "@/pages/chat"
import SessionList from "@/pages/session/list"
import SessionDetail from "@/pages/session/detail"
import Workflow from "@/pages/workflow"
import { TitleBar } from "@/components/layout/titlebar"
import { NanoDock } from "@/components/layout/dock"
import { StatusBar } from "@/components/layout/status"
import { useGateway } from "@/hooks/use-gateway"
import { AnimatePresence, motion } from "motion/react"
import { Route, Routes, useLocation } from "react-router"
import { TooltipProvider } from "@/components/ui/tooltip"
import { useThemeEffect } from "@/hooks/use-theme-effect"
import { useEffect } from "react"
import { attachChatListeners } from "@/stores/chat"
import { useAgentCacheStore } from "@/stores/agent"

function App() {
  useThemeEffect()
  useGateway()
  const location = useLocation()

  useEffect(() => {
    void window.electron.openclaw.gateway.connect()
  }, [])

  useEffect(() => attachChatListeners(), [])

  // 全局 agent 列表预热:任何页面(chat / session / 等)进入前就已有缓存,避免"头像空白闪一下"。
  // gateway 就绪后轮询重试(最多 30 次 × 1s),直到成功一次。
  useEffect(() => {
    let cancelled = false
    const tryLoad = async (attempts = 0): Promise<void> => {
      if (cancelled || useAgentCacheStore.getState().listResult) return
      try {
        const res = await window.electron.agent.list()
        if (!cancelled) useAgentCacheStore.getState().setListResult(res)
      } catch {
        if (attempts < 30 && !cancelled) {
          setTimeout(() => void tryLoad(attempts + 1), 1000)
        }
      }
    }
    void tryLoad()
    return () => {
      cancelled = true
    }
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
                initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              >
                <Routes location={location}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/task" element={<Task />} />
                  <Route path="/knowledge" element={<KnowledgeList />} />
                  <Route path="/knowledge/:id" element={<KnowledgeDetail />} />
                  <Route path="/agent" element={<AgentList />} />
                  <Route path="/agent/:id" element={<AgentDetail />} />
                  <Route path="/chat" element={<Chat />} />
                  <Route path="/session" element={<SessionList />} />
                  <Route path="/session/:id" element={<SessionDetail />} />
                  <Route path="/workflow" element={<Workflow />} />
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
