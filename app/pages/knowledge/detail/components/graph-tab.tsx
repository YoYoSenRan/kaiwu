import type { ForceGraphMethods, NodeObject, LinkObject } from "react-force-graph-2d"
import { Button } from "@/components/ui/button"
import { X, ZoomIn, ZoomOut, Maximize2 } from "lucide-react"
import ForceGraph2D from "react-force-graph-2d"

interface GraphNode {
  id: string
  label: string
  type: "kb" | "doc" | "chunk"
  detail?: string
}

interface GraphLink {
  source: string
  target: string
}

interface GraphData {
  nodes: GraphNode[]
  links: GraphLink[]
}

/** 节点颜色——柔和色调，深色背景下舒适。 */
const NODE_COLORS: Record<GraphNode["type"], string> = {
  kb: "#38bdf8",
  doc: "#818cf8",
  chunk: "#a5b4fc",
}

/** 节点默认半径。 */
const NODE_RADIUS: Record<GraphNode["type"], number> = {
  kb: 16,
  doc: 8,
  chunk: 4,
}

interface Props {
  kbId: string
  kbName: string
  docs: Awaited<ReturnType<typeof window.electron.knowledge.doc.list>>
}

/** 知识图谱 tab：2D 力导向图可视化知识库 → 文档 → 分块。 */
export function GraphTab({ kbId, kbName, docs }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const fgRef = useRef<ForceGraphMethods<NodeObject<GraphNode>, LinkObject<GraphNode, GraphLink>>>(undefined)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [data, setData] = useState<GraphData | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)

  // 加载图谱数据
  useEffect(() => {
    void (async () => {
      const nodes: GraphNode[] = [{ id: kbId, label: kbName, type: "kb" }]
      const links: GraphLink[] = []
      const readyDocs = docs.filter((d) => d.state === "ready")

      for (const doc of readyDocs) {
        nodes.push({ id: doc.id, label: doc.title, type: "doc", detail: `${doc.format.toUpperCase()} · ${doc.chunk_count} chunks` })
        links.push({ source: kbId, target: doc.id })
        try {
          const chunks = await window.electron.knowledge.doc.chunks(doc.id)
          for (const chunk of chunks) {
            const preview = chunk.content.slice(0, 80) + (chunk.content.length > 80 ? "..." : "")
            nodes.push({ id: chunk.id, label: `#${chunk.position + 1}`, type: "chunk", detail: preview })
            links.push({ source: doc.id, target: chunk.id })
          }
        } catch {
          /* ignore */
        }
      }
      setData({ nodes, links })
    })()
  }, [kbId, kbName, docs])

  // 容器尺寸监听
  useEffect(() => {
    if (!containerRef.current) return
    const el = containerRef.current
    const update = () => {
      const rect = el.getBoundingClientRect()
      setDimensions({ width: Math.floor(rect.width), height: Math.floor(rect.height) })
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const typeLabel = (type: GraphNode["type"]) => (type === "kb" ? "知识库" : type === "doc" ? "文档" : "分块")

  /** 自定义 Canvas 节点绘制：圆形 + 光晕 + 标签，hover 时放大。 */
  const paintNode = useCallback(
    (node: NodeObject<GraphNode>, ctx: CanvasRenderingContext2D) => {
      const x = node.x ?? 0
      const y = node.y ?? 0
      const baseR = NODE_RADIUS[node.type] ?? 4
      const isHovered = node.id === hoveredId
      const r = isHovered ? baseR * 1.4 : baseR
      const color = NODE_COLORS[node.type] ?? "#888"

      // 外圈光晕
      const glow = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 2)
      glow.addColorStop(0, color + "30")
      glow.addColorStop(1, "transparent")
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(x, y, r * 2, 0, Math.PI * 2)
      ctx.fill()

      // 实心圆
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()

      // 高光（左上角小白点）
      const hlGrad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r)
      hlGrad.addColorStop(0, "rgba(255,255,255,0.5)")
      hlGrad.addColorStop(0.5, "rgba(255,255,255,0)")
      ctx.fillStyle = hlGrad
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()

      // 文字标签（kb 和 doc 显示，chunk 只在 hover 时显示）
      if (node.type !== "chunk" || isHovered) {
        const fontSize = node.type === "kb" ? 5 : node.type === "doc" ? 3.5 : 2.5
        const label = node.label.slice(0, 14) + (node.label.length > 14 ? "…" : "")
        ctx.font = `bold ${fontSize}px sans-serif`
        ctx.textAlign = "center"
        ctx.textBaseline = "top"
        ctx.fillStyle = "rgba(255,255,255,0.85)"
        ctx.fillText(label, x, y + r + 2)
      }
    },
    [hoveredId],
  )

  return (
    <div ref={containerRef} className="relative min-h-0 flex-1 overflow-hidden rounded-xl border bg-[#0a0a14]">
      {/* 工具栏 */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-end p-3">
        <div className="pointer-events-auto flex gap-1 rounded-lg border border-white/10 bg-black/60 p-1 backdrop-blur">
          <Button variant="ghost" size="icon" onClick={() => fgRef.current?.zoomToFit(400, 40)}>
            <Maximize2 />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => fgRef.current?.zoom((fgRef.current?.zoom?.() ?? 1) * 1.3, 200)}>
            <ZoomIn />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => fgRef.current?.zoom((fgRef.current?.zoom?.() ?? 1) / 1.3, 200)}>
            <ZoomOut />
          </Button>
        </div>
      </div>

      {/* 图例 */}
      <div className="pointer-events-none absolute bottom-3 left-3 z-10 flex gap-3 rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-xs text-white/70 backdrop-blur">
        {(["kb", "doc", "chunk"] as const).map((type) => (
          <div key={type} className="flex items-center gap-1.5">
            <span className="inline-block size-2 rounded-full" style={{ backgroundColor: NODE_COLORS[type] }} />
            <span>{typeLabel(type)}</span>
          </div>
        ))}
      </div>

      {/* 选中节点详情 */}
      {selectedNode && (
        <div className="absolute top-12 right-3 z-10 w-60 rounded-lg border border-white/10 bg-black/80 p-3 text-white shadow-lg backdrop-blur">
          <div className="flex items-start justify-between">
            <span className="text-xs font-medium text-white/50">{typeLabel(selectedNode.type)}</span>
            <Button variant="ghost" size="icon" onClick={() => setSelectedNode(null)}>
              <X />
            </Button>
          </div>
          <p className="mt-1 text-sm leading-snug font-medium">{selectedNode.label}</p>
          {selectedNode.detail && <p className="mt-1 text-xs leading-relaxed text-white/50">{selectedNode.detail}</p>}
        </div>
      )}

      {data && dimensions.width > 0 && dimensions.height > 0 && (
        <ForceGraph2D
          ref={fgRef}
          width={dimensions.width}
          height={dimensions.height}
          graphData={data}
          backgroundColor="#0a0a14"
          nodeCanvasObject={paintNode}
          nodePointerAreaPaint={(node: NodeObject<GraphNode>, color, ctx) => {
            const r = NODE_RADIUS[node.type] ?? 4
            ctx.fillStyle = color
            ctx.beginPath()
            ctx.arc(node.x ?? 0, node.y ?? 0, r * 1.5, 0, Math.PI * 2)
            ctx.fill()
          }}
          linkColor={() => "rgba(255,255,255,0.08)"}
          linkDirectionalParticles={1}
          linkDirectionalParticleWidth={1.5}
          linkDirectionalParticleColor={() => "rgba(255,255,255,0.2)"}
          onNodeHover={(node) => setHoveredId(node?.id ?? null)}
          onNodeClick={(node) => setSelectedNode(node)}
          onEngineStop={() => fgRef.current?.zoomToFit(400, 40)}
        />
      )}
    </div>
  )
}
