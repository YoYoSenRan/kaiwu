"use client"

import type { ForceGraphMethods, NodeObject, LinkObject } from "react-force-graph-3d"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Vector2 } from "three"
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js"
import { useEffect, useRef, useState } from "react"
import { Search, MessageSquare, X, ZoomIn, ZoomOut, Maximize2 } from "lucide-react"
import ForceGraph3D from "react-force-graph-3d"

interface GraphNode {
  id: string
  user: string
  description: string
  x?: number
  y?: number
  z?: number
}

interface GraphLink {
  source: string
  target: string
}

interface GraphData {
  nodes: GraphNode[]
  links: GraphLink[]
}

interface ForceGraph3DMethodsExt extends ForceGraphMethods<NodeObject<GraphNode>, LinkObject<GraphNode, GraphLink>> {
  zoom?: {
    (): number
    (factor: number, duration?: number): void
  }
}

export function KnowledgeGraph() {
  const containerRef = useRef<HTMLDivElement>(null)
  const fgRef = useRef<ForceGraph3DMethodsExt>(undefined)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [data, setData] = useState<GraphData | null>(null)
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)

  useEffect(() => {
    fetch("/blocks.json")
      .then((res) => res.json())
      .then((json: unknown) => setData(json as GraphData))
      .catch((err: Error) => console.error("Failed to load blocks.json:", err))
  }, [])

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

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!fgRef.current?.postProcessingComposer) return
      try {
        const bloomPass = new UnrealBloomPass(new Vector2(256, 256), 1.2, 0.3, 0)
        fgRef.current.postProcessingComposer().addPass(bloomPass)
      } catch (e) {
        console.error("Bloom pass failed:", e)
      }
    }, 500)
    return () => window.clearTimeout(timer)
  }, [])

  const handleNodeClick = (node: NodeObject<GraphNode>) => {
    setSelectedNode(node)
    const distance = 100
    const distRatio = 1 + distance / Math.hypot(node.x || 1, node.y || 1, node.z || 1)
    fgRef.current?.cameraPosition(
      { x: (node.x || 0) * distRatio, y: (node.y || 0) * distRatio, z: (node.z || 0) * distRatio },
      { x: node.x || 0, y: node.y || 0, z: node.z || 0 },
      1000,
    )
  }

  return (
    <div ref={containerRef} className="relative h-[600px] w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
      {/* Toolbar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between p-4">
        <div className="pointer-events-auto flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/90 px-3 py-2 text-slate-100 shadow-sm backdrop-blur">
          <Search className="size-4 text-slate-400" />
          <input placeholder="搜索节点..." className="w-40 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-400" readOnly />
        </div>

        <div className="pointer-events-auto flex gap-1 rounded-lg border border-slate-700 bg-slate-900/90 p-1 shadow-sm backdrop-blur">
          <Button variant="ghost" size="icon" className="size-8 text-slate-100 hover:bg-slate-800 hover:text-white" onClick={() => fgRef.current?.zoomToFit(400)}>
            <Maximize2 className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-slate-100 hover:bg-slate-800 hover:text-white"
            onClick={() => {
              const currentZoom = fgRef.current?.zoom?.()
              if (typeof currentZoom === "number") {
                fgRef.current?.zoom?.(currentZoom * 1.2, 200)
              }
            }}
          >
            <ZoomIn className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-slate-100 hover:bg-slate-800 hover:text-white"
            onClick={() => {
              const currentZoom = fgRef.current?.zoom?.()
              if (typeof currentZoom === "number") {
                fgRef.current?.zoom?.(currentZoom / 1.2, 200)
              }
            }}
          >
            <ZoomOut className="size-4" />
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="pointer-events-none absolute bottom-4 left-4 z-10 rounded-lg border border-slate-700 bg-slate-900/90 px-3 py-2 text-xs text-slate-200 shadow-sm backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="inline-block size-2 rounded-full bg-[#60a5fa]" />
          <span>示例数据：blocks.json</span>
        </div>
      </div>

      {/* Selected node panel */}
      {selectedNode && (
        <div className="absolute top-16 right-4 z-10 w-64">
          <Card className="border-slate-700 bg-slate-900/95 p-4 text-slate-100 shadow-lg backdrop-blur">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-400 uppercase">Block</span>
              </div>
              <Button variant="ghost" size="icon" className="-mt-2 -mr-2 size-7 text-slate-300 hover:bg-slate-800 hover:text-white" onClick={() => setSelectedNode(null)}>
                <X className="size-4" />
              </Button>
            </div>
            <p className="mt-2 text-sm leading-snug font-medium">{selectedNode.user}</p>
            <p className="mt-1 text-xs text-slate-400">{selectedNode.description}</p>
            <div className="mt-3 flex gap-2">
              <Button size="sm" className="h-8 flex-1 text-xs">
                <MessageSquare className="mr-1.5 size-3.5" />
                去提问
              </Button>
            </div>
          </Card>
        </div>
      )}

      {data && dimensions.width > 0 && dimensions.height > 0 && (
        <ForceGraph3D
          ref={fgRef}
          width={dimensions.width}
          height={dimensions.height}
          graphData={data}
          backgroundColor="#020617"
          showNavInfo={false}
          nodeAutoColorBy="user"
          nodeLabel={(node: NodeObject<GraphNode>) => `<div><b>${node.user}</b>: ${node.description}</div>`}
          linkDirectionalParticles={1}
          controlType="orbit"
          onNodeClick={(node: NodeObject<GraphNode>) => handleNodeClick(node)}
          onEngineStop={() => fgRef.current?.zoomToFit(400)}
        />
      )}
    </div>
  )
}
