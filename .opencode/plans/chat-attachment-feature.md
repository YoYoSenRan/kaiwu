# Chat Input Attachment Feature Plan

## Context

User wants to add attachment upload functionality to the chat input area in kaiwu project, referencing OpenClaw's design. The project uses React + Tailwind CSS + shadcn/ui.

## Current State

- File: `/Users/macos/WebProject/kaiwu/app/pages/chat/components/chat-main.tsx`
- Current input area: simple textarea + send button
- Uses lucide-react icons (no Paperclip currently)
- No attachment-related types or logic
- i18n keys need to be added

## Requirements

1. Add attachment upload button (paperclip icon)
2. Add attachment preview area (image thumbnails + delete button)
3. Support drag-and-drop upload
4. Support paste upload
5. Adjust layout: left toolbar (attachment button), middle textarea, right send button
6. Keep existing HITL and send logic unchanged
7. Use Tailwind CSS for styling
8. TypeScript types must be correct

## Implementation Plan

### Step 1: Modify chat-main.tsx

#### Add imports
- Add `Paperclip` and `X` from lucide-react

#### Add types and helpers (before ChatMain component)
```typescript
type ChatAttachment = {
  id: string;
  dataUrl: string;
  mimeType: string;
};

function generateAttachmentId(): string {
  return `att-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function isSupportedChatAttachmentMimeType(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}
```

#### Add state and refs (inside ChatMain)
```typescript
const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
const fileInputRef = useRef<HTMLInputElement>(null);
```

#### Add handlers (inside ChatMain)
```typescript
const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = e.target.files;
  if (!files) return;
  
  const current = attachments;
  const additions: ChatAttachment[] = [];
  let pending = 0;
  
  for (const file of files) {
    if (!isSupportedChatAttachmentMimeType(file.type)) continue;
    pending++;
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      additions.push({
        id: generateAttachmentId(),
        dataUrl: reader.result as string,
        mimeType: file.type,
      });
      pending--;
      if (pending === 0) {
        setAttachments([...current, ...additions]);
      }
    });
    reader.readAsDataURL(file);
  }
  
  e.target.value = "";
};

const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
  const items = e.clipboardData?.items;
  if (!items) return;
  
  const imageItems: DataTransferItem[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.type.startsWith("image/")) imageItems.push(item);
  }
  
  if (imageItems.length === 0) return;
  e.preventDefault();
  
  for (const item of imageItems) {
    const file = item.getAsFile();
    if (!file) continue;
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      const dataUrl = reader.result as string;
      const newAttachment: ChatAttachment = {
        id: generateAttachmentId(),
        dataUrl,
        mimeType: file.type,
      };
      setAttachments((prev) => [...prev, newAttachment]);
    });
    reader.readAsDataURL(file);
  }
};

const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
  e.preventDefault();
  const files = e.dataTransfer?.files;
  if (!files) return;
  
  const current = attachments;
  const additions: ChatAttachment[] = [];
  let pending = 0;
  
  for (const file of files) {
    if (!isSupportedChatAttachmentMimeType(file.type)) continue;
    pending++;
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      additions.push({
        id: generateAttachmentId(),
        dataUrl: reader.result as string,
        mimeType: file.type,
      });
      pending--;
      if (pending === 0) {
        setAttachments([...current, ...additions]);
      }
    });
    reader.readAsDataURL(file);
  }
};

const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
  e.preventDefault();
};

const removeAttachment = (id: string) => {
  setAttachments((prev) => prev.filter((a) => a.id !== id));
};
```

#### Modify JSX

Replace the bottom input area (lines 237-265):

```tsx
<div 
  className="border-border/50 shrink-0 border-t p-4"
  onDrop={handleDrop}
  onDragOver={handleDragOver}
>
  {isHitl && pending && (
    <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <span>{t("chat.hitl.prompt", { agentId: pending.byAgentId, question: pending.question })}</span>
    </div>
  )}
  
  {/* Attachment preview area */}
  {attachments.length > 0 && (
    <div className="mb-3 flex flex-wrap gap-2">
      {attachments.map((att) => (
        <div key={att.id} className="relative size-16">
          <img 
            src={att.dataUrl} 
            alt="Attachment preview" 
            className="size-full rounded-lg object-cover ring-1 ring-border"
          />
          <button
            type="button"
            onClick={() => removeAttachment(att.id)}
            className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90"
            aria-label={t("chat.attachment.remove")}
          >
            <X className="size-3" />
          </button>
        </div>
      ))}
    </div>
  )}
  
  <form onSubmit={handleSubmit} className="flex items-end gap-2">
    {/* Left toolbar */}
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="text-muted-foreground hover:text-foreground flex size-9 items-center justify-center rounded-lg transition-colors"
        aria-label={t("chat.attachment.upload")}
      >
        <Paperclip className="size-5" />
      </button>
      <input
        ref={fileInputRef}
        type="file"
        hidden
        multiple
        accept="image/*"
        onChange={handleFileSelect}
      />
    </div>
    
    {/* Middle textarea */}
    <Textarea
      ref={textareaRef}
      value={input}
      onChange={(e) => setInput(e.target.value)}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      placeholder={t("chat.placeholder")}
      disabled={isRunning}
      rows={1}
      className="min-h-[40px] max-h-[200px] resize-none overflow-hidden py-2.5"
    />
    
    {/* Right send button */}
    {isRunning ? (
      <Button size="icon" type="button" variant="destructive" onClick={handleAbort}>
        <Square />
      </Button>
    ) : (
      <Button size="icon" type="submit" disabled={!input.trim()}>
        <Send />
      </Button>
    )}
  </form>
</div>
```

### Step 2: Add i18n translations

Add to both `zh-CN.json` and `en.json` under `chat` section:

```json
"attachment": {
  "upload": "上传附件",
  "remove": "删除附件"
}
```

For en:
```json
"attachment": {
  "upload": "Upload attachment",
  "remove": "Remove attachment"
}
```

## Acceptance Criteria

- [ ] Paperclip icon appears in left toolbar
- [ ] Clicking paperclip opens file picker
- [ ] Selected images appear as thumbnails above input
- [ ] Each thumbnail has a delete button (X)
- [ ] Dragging images onto input area uploads them
- [ ] Pasting images into textarea uploads them
- [ ] HITL prompt still displays correctly
- [ ] Send button still works
- [ ] Abort button still works
- [ ] TypeScript compiles without errors
- [ ] ESLint passes

## Notes

- Attachments are stored in component state only (not sent to backend yet)
- Only image files are supported (image/*)
- Multiple file selection is supported
- The existing message list rendering is untouched
- No zustand store modifications
- No new dependencies added
