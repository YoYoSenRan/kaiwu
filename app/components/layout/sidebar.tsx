import { Zap } from "lucide-react"
import { NAV_ITEMS } from "./nav-items"
import { useTranslation } from "react-i18next"
import { gatewayDotColor } from "@/lib/gateway"
import { NavLink, useLocation, useNavigate } from "react-router"
import { useGatewayStore } from "@/stores/gateway"
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"

/**
 * 左侧导航栏：基于 shadcn Sidebar 组件，collapsible="icon" 允许折叠为仅图标态。
 * 折叠状态由 App.tsx 的 SidebarProvider 受控，绑定到 settings store 持久化。
 * 底部展示 gateway 连接状态指示，点击跳转连接页。
 */
export function AppSidebar() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const gwStatus = useGatewayStore((s) => s.status)
  const gwUrl = useGatewayStore((s) => s.url)

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <Zap className="text-primary size-5 shrink-0" strokeWidth={2} />
          <div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold">Kaiwu</span>
            <span className="text-muted-foreground text-[11px]">开物</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon
              const isActive = item.path === "/" ? pathname === "/" : pathname.startsWith(item.path)
              const label = t(`nav.${item.key}`)
              return (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton asChild isActive={isActive} tooltip={label}>
                    <NavLink to={item.path} end={item.path === "/"}>
                      <Icon />
                      <span>{label}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-0">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="border-sidebar-border h-10 rounded-none border-t px-4"
              onClick={() => navigate("/connect")}
              tooltip={gwStatus === "connected" && gwUrl ? gwUrl : t(`connect.status.${gwStatus}`)}
            >
              <span className={`size-2 shrink-0 rounded-full ${gatewayDotColor(gwStatus)}`} />
              <span className="truncate text-xs">{gwStatus === "connected" && gwUrl ? gwUrl.replace("ws://", "") : t(`connect.status.${gwStatus}`)}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
