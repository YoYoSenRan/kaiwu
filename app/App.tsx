import Demo from "@/pages/demo"
import { AnimatePresence, motion } from "motion/react"
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
      <div className="app-scroll">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <Routes location={location}>
              <Route path="/" element={<Demo />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  )
}

export default App
