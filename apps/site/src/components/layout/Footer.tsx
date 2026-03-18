import Link from "next/link"
import { cn } from "@/lib/utils"

const FOOTER_NAV = {
  造物: [
    { label: "造物志", href: "/stories" },
    { label: "造物坊", href: "/pipeline" },
    { label: "封存阁", href: "/stories?status=archived" },
  ],
  局中人: [
    { label: "认识他们", href: "/agents" },
  ],
  参与: [
    { label: "投一张物帖", href: "/trends" },
    { label: "关于", href: "/about" },
    { label: "GitHub", href: "https://github.com" },
  ],
} as const

export function Footer(): React.ReactElement {
  return (
    <footer className="border-t border-border/30 bg-muted">
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16">
        {/* 上半区 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* 品牌 */}
          <div className="col-span-2 md:col-span-1">
            <p className="font-display text-lg font-700 text-foreground">开物局</p>
            <p className="mt-2 text-sm text-muted-fg">天工开物，每帖必应。</p>
          </div>

          {/* 导航栏 */}
          {Object.entries(FOOTER_NAV).map(([group, links]) => (
            <div key={group}>
              <p className="text-sm font-600 text-foreground mb-3">{group}</p>
              <ul className="flex flex-col gap-2">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-fg hover:text-foreground t-fast"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* 下半区 */}
        <div
          className={cn(
            "mt-12 pt-6 border-t border-border/30",
            "flex flex-col md:flex-row items-center justify-between gap-2",
            "text-xs text-muted-fg",
          )}
        >
          <p>© 2026 开物局 · 以 OpenClaw 为底座</p>
          <div className="flex gap-4">
            <Link href="https://github.com" className="hover:text-foreground t-fast">
              GitHub
            </Link>
            <Link href="/about" className="hover:text-foreground t-fast">
              文档
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
