import { ChatSidebar } from "./components/chat-sidebar"
import { ChatMain } from "./components/chat-main"
import { ChatDetails } from "./components/chat-details"

export default function Chat() {
  return (
    <div className="flex h-full w-full gap-4">
      <ChatSidebar />
      <ChatMain />
      <ChatDetails />
    </div>
  )
}
