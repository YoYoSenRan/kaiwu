import { FileText, Database } from "lucide-react"
import { useNavigate } from "react-router"
import { Card, CardContent } from "@/components/ui/card"

interface Props {
  id: string
  name: string
  description: string | null
  docCount: number
  chunkCount: number
}

/** 知识库卡片。 */
export function KnowledgeCard({ id, name, description, docCount, chunkCount }: Props) {
  const navigate = useNavigate()

  return (
    <Card className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => navigate(`/knowledge/${id}`)}>
      <CardContent className="space-y-2 p-4">
        <h3 className="text-sm font-medium">{name}</h3>
        {description && <p className="text-muted-foreground line-clamp-2 text-xs">{description}</p>}
        <div className="text-muted-foreground flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1">
            <FileText className="size-3" />
            {docCount}
          </span>
          <span className="flex items-center gap-1">
            <Database className="size-3" />
            {chunkCount}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
