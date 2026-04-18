import type { ReactNode } from "react"
import { X } from "lucide-react"

import "./modal.css"
import { createPortal } from "react-dom"

interface ModalTemplateProps {
  title?: ReactNode
  footer?: ReactNode
  cancelText?: string
  okText?: string
  onCancel?: () => void
  onOk?: () => void
  width?: number
  children?: ReactNode
}

function ModalTemplate({ title, children, footer, cancelText = "Cancel", okText = "OK", onCancel, onOk, width = 530 }: ModalTemplateProps) {
  return (
    <div className="update-modal">
      <div className="update-modal__mask" />
      <div className="update-modal__warp">
        <div className="update-modal__content" style={{ width }}>
          <div className="content__header">
            <div className="content__header-text">{title}</div>
            <span className="update-modal--close" onClick={onCancel}>
              <X className="size-5" />
            </span>
          </div>
          <div className="content__body">{children}</div>
          {typeof footer !== "undefined" ? (
            <div className="content__footer">
              <button onClick={onCancel}>{cancelText}</button>
              <button onClick={onOk}>{okText}</button>
            </div>
          ) : (
            footer
          )}
        </div>
      </div>
    </div>
  )
}

interface ModalProps extends Omit<ModalTemplateProps, "children"> {
  open: boolean
  children?: ReactNode
}

export default function Modal({ open, children, ...rest }: ModalProps) {
  return createPortal(open ? <ModalTemplate {...rest}>{children}</ModalTemplate> : null, document.body)
}
