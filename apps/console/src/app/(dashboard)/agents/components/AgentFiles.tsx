"use client"

import { useState } from "react"
import { WORKSPACE_FILES } from "../constants"
import { AgentFileEditor } from "./AgentFileEditor"

interface AgentFilesProps {
  agentId: string
}

interface FileEntry {
  filename: string
  label: string
  description: string
}

export function AgentFiles({ agentId }: AgentFilesProps) {
  const [editingFile, setEditingFile] = useState<string | null>(null)

  const files: FileEntry[] = Object.entries(WORKSPACE_FILES).map(([filename, meta]) => ({ filename, ...meta }))

  return (
    <div className="space-y-2">
      <h3 className="mb-3 text-sm font-medium text-muted-foreground">Workspace 文件</h3>
      <div className="divide-y divide-border rounded-lg border border-border">
        {files.map((file) => (
          <div key={file.filename}>
            <div className="flex items-center justify-between p-3">
              <div>
                <p className="text-sm font-medium">
                  {file.label}
                  <span className="ml-2 text-xs text-muted-foreground">({file.filename})</span>
                </p>
                <p className="text-xs text-muted-foreground">{file.description}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingFile(editingFile === file.filename ? null : file.filename)}
                className="rounded-md px-3 py-1 text-xs text-primary hover:bg-accent"
              >
                {editingFile === file.filename ? "收起" : "编辑"}
              </button>
            </div>
            {editingFile === file.filename && (
              <div className="border-t border-border p-3">
                <AgentFileEditor agentId={agentId} filename={file.filename} label={file.label} onClose={() => setEditingFile(null)} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
