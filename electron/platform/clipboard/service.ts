import { clipboard, nativeImage } from "electron"
import { Controller, Handle, IpcController } from "../../framework"

/**
 * 剪贴板模块：读写文本和图片。
 * renderer 的 navigator.clipboard 在某些平台/场景下受限（如读取图片），主进程的 clipboard API 更可靠。
 */
@Controller("clipboard")
export class ClipboardService extends IpcController {
  @Handle("read-text")
  readText() {
    return clipboard.readText()
  }

  @Handle("write-text")
  writeText(text: string) {
    clipboard.writeText(text)
  }

  @Handle("read-image")
  readImage() {
    const img = clipboard.readImage()
    return img.isEmpty() ? "" : img.toDataURL()
  }

  @Handle("write-image")
  writeImage(dataUrl: string) {
    clipboard.writeImage(nativeImage.createFromDataURL(dataUrl))
  }
}
