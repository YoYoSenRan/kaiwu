import type { Metadata } from "next"
import { fontMono, GOOGLE_FONTS_URL } from "@/lib/fonts"
import { Navbar } from "@/components/layout/Navbar"
import { Footer } from "@/components/layout/Footer"
import { LiveActivityBar } from "@/components/layout/LiveActivityBar"
import "./globals.css"

export const metadata: Metadata = {
  title: "开物局",
  description: "天工开物，每帖必应。AI Agent 协作造物展示平台。",
  openGraph: {
    title: "开物局",
    description: "天工开物，每帖必应。AI Agent 协作造物展示平台。",
    siteName: "开物局",
  },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>): React.ReactElement {
  return (
    <html lang="zh-CN" className={fontMono.variable}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={GOOGLE_FONTS_URL} />
      </head>
      <body className="font-body">
        <Navbar />
        <main className="mx-auto max-w-7xl px-6 lg:px-8 min-h-[calc(100vh-4rem)]">
          {children}
        </main>
        <Footer />
        <LiveActivityBar />
      </body>
    </html>
  )
}
