import { Loader2, Send, StopCircle } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { useChatStore } from "@/stores/chat"
import { Textarea } from "@/components/ui/textarea"

interface ChatInputProps {
  chat: { id: string; mode: string }
}

/** 消息输入区域，支持 Enter 发送、流式中断。 */
export function ChatInput({ chat }: ChatInputProps) {
  const { t } = useTranslation()
  const sending = useChatStore((s) => s.sending)
  const setSending = useChatStore((s) => s.setSending)
  const streamingMessageId = useChatStore((s) => s.streamingMessageId)
  const roundtableStatus = useChatStore((s) => s.roundtableStatus)
  const appendMessage = useChatStore((s) => s.appendMessage)
  const [text, setText] = useState("")

  const isStreaming = !!streamingMessageId
  const isBusy = sending || isStreaming
  const isRoundtableRunning = chat.mode === "roundtable" && roundtableStatus === "running"
  const disabled = isBusy || isRoundtableRunning

  const send = () => {
    const trimmed = text.trim()
    if (!trimmed || disabled) return
    appendMessage({
      id: crypto.randomUUID(),
      chat_id: chat.id,
      sender_type: "user",
      sender_agent_id: null,
      content: trimmed,
      status: "pending",
      invocation_id: null,
      run_id: null,
      remote_seq: null,
      content_hash: null,
      metadata: "{}",
      created_at: Date.now(),
    })
    setSending(true)
    window.electron.chat.messages.send({ chatId: chat.id, content: trimmed })
    setText("")
  }

  const abort = () => {
    window.electron.chat.abort(chat.id)
  }

  /** Enter 发送，Shift+Enter 换行。 */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const placeholder = chat.mode === "roundtable" ? t("chat.inputPlaceholderRoundtable") : t("chat.inputPlaceholder")

  return (
    <div className="border-border shrink-0 border-t p-3">
      <div className="flex items-center gap-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="max-h-32 min-h-9 resize-none text-sm"
          aria-label={placeholder}
        />
        {isBusy ? (
          <Button variant="ghost" size="icon-sm" onClick={abort} title={t("chat.abort")} aria-label={t("chat.abort")}>
            {/* 等待首个 delta 时显示 spinner，流式输出中显示停止图标 */}
            {sending && !isStreaming ? <Loader2 className="size-4 animate-spin" /> : <StopCircle className="size-4" />}
          </Button>
        ) : (
          <Button variant="ghost" size="icon-sm" onClick={send} disabled={!text.trim() || disabled} title={t("chat.send")} aria-label={t("chat.send")}>
            <Send className="size-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
