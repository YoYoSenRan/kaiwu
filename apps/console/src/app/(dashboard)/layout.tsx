import { Sidebar } from "@/components/layout/Sidebar"
import { Header } from "@/components/layout/Header"
import { GatewayGuard } from "@/components/gateway/GatewayGuard"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <GatewayGuard>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </GatewayGuard>
  )
}
