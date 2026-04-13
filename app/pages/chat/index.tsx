import { useTranslation } from "react-i18next"
import { useChatStore } from "@/stores/chat"
import { Button } from "@/components/ui/button"
import { MessagesSquare } from "lucide-react"
import { ChatList } from "./components/list"
import { ChatInput } from "./components/input"
import { InfoPanel } from "./components/panel"
import { ChatHeader } from "./components/header"
import { MessageList } from "./components/messages"
import { CreateChatDialog } from "./components/create"

/** 对话页：三栏布局。用 absolute 撑满 main 区域，滚动完全由内部 ScrollArea 接管。 */
export default function Chat() {
  const { t } = useTranslation()
  const chats = useChatStore((s) => s.chats)
  const activeId = useChatStore((s) => s.activeId)
  const setChats = useChatStore((s) => s.setChats)
  const setMessages = useChatStore((s) => s.setMessages)
  const setMembers = useChatStore((s) => s.setMembers)
  const setInvocations = useChatStore((s) => s.setInvocations)
  const handleStreamEvent = useChatStore((s) => s.handleStreamEvent)
  const handleRoundtableEvent = useChatStore((s) => s.handleRoundtableEvent)
  const reset = useChatStore((s) => s.reset)
  const [createOpen, setCreateOpen] = useState(false)

  useEffect(() => {
    window.electron.chat.list().then(setChats)
  }, [setChats])

  useEffect(() => {
    const unsub1 = window.electron.chat.on.stream((event) => {
      handleStreamEvent(event)
      if (event.type === "final" && event.chatId === useChatStore.getState().activeId) {
        window.electron.chat.messages.list(event.chatId).then(setMessages)
        window.electron.chat.invocations.list(event.chatId).then(setInvocations)
      }
    })
    const unsub2 = window.electron.chat.on.roundtable(handleRoundtableEvent)
    return () => {
      unsub1()
      unsub2()
    }
  }, [handleStreamEvent, handleRoundtableEvent, setMessages, setInvocations])

  useEffect(() => {
    if (!activeId) {
      reset()
      return
    }
    window.electron.chat
      .sync(activeId)
      .catch(() => {})
      .finally(() => {
        window.electron.chat.messages.list(activeId).then(setMessages)
        window.electron.chat.members.list(activeId).then(setMembers)
        window.electron.chat.invocations.list(activeId).then(setInvocations)
      })
  }, [activeId, reset, setMessages, setMembers, setInvocations])

  const activeChat = chats.find((c) => c.id === activeId)

  return (
    <>
      {/* absolute 撑满 main（main 已有 relative），脱离文档流不参与 main 的滚动 */}
      <div className="absolute inset-0 flex">
        <ChatList onCreateClick={() => setCreateOpen(true)} />

        <div className="border-border flex min-w-0 flex-1 flex-col border-x">
          {activeChat ? (
            <>
              <ChatHeader chat={activeChat} />
              <MessageList />
              <ChatInput chat={activeChat} />
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
              <div className="bg-muted flex size-12 items-center justify-center rounded-full">
                <MessagesSquare className="text-muted-foreground size-6" />
              </div>
              <div>
                <p className="text-sm font-medium">{t("chat.empty")}</p>
                <p className="text-muted-foreground mt-1 max-w-xs text-xs">{t("chat.description")}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
                {t("chat.startConversation")}
              </Button>
            </div>
          )}
        </div>

        {activeChat && <InfoPanel chat={activeChat} />}
      </div>

      <CreateChatDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  )
}
