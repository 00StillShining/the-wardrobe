import { useEffect, useRef, type ReactNode } from 'react'
import s from './Dialog.module.css'
import { Button } from './Button'
import { IconButton } from './IconButton'
import { X } from 'lucide-react'

interface OverlayProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  /** Footer actions; confirmation dialogs pass buttons here */
  actions?: ReactNode
}

function useNativeDialog(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) {
      el.showModal()
      // native focus lands on the first focusable (the header Close button);
      // prefer an explicit target, then the first form control in the body
      const target =
        el.querySelector<HTMLElement>('[data-autofocus]') ??
        el.querySelector<HTMLElement>('input, select, textarea')
      target?.focus()
    }
    if (!open && el.open) el.close()
  }, [open])
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const handleClose = () => onClose()
    const handleCancel = (e: Event) => {
      e.preventDefault()
      onClose()
    }
    el.addEventListener('close', handleClose)
    el.addEventListener('cancel', handleCancel)
    return () => {
      el.removeEventListener('close', handleClose)
      el.removeEventListener('cancel', handleCancel)
    }
  }, [onClose])
  return ref
}

/** Modal dialog on the native <dialog> element (focus trap + return for free). */
export function Dialog({ open, onClose, title, children, actions }: OverlayProps) {
  const ref = useNativeDialog(open, onClose)
  return (
    <dialog ref={ref} className={s.dialog} aria-label={title}>
      <header className={s.head}>
        <h2 className={s.title}>{title}</h2>
        <IconButton label="Close" onClick={onClose}>
          <X />
        </IconButton>
      </header>
      <div className={s.body}>{children}</div>
      {actions && <footer className={s.foot}>{actions}</footer>}
    </dialog>
  )
}

export interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  body: string
  confirmLabel: string
  danger?: boolean
}

/** Destructive actions get an explicit confirmation with oxblood emphasis (plan §6.6). */
export function ConfirmDialog({ open, onClose, onConfirm, title, body, confirmLabel, danger }: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      actions={
        <>
          {/* focus opens on the safe action, never on destructive confirm */}
          <Button variant="ghost" onClick={onClose} data-autofocus>
            Cancel
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            onClick={() => {
              onConfirm()
              onClose()
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p>{body}</p>
    </Dialog>
  )
}

/**
 * Sheet: same overlay mechanics, edge-anchored (bottom on touch, right on
 * desktop). Unlike Dialog/ConfirmDialog (explicit close only), tapping the
 * scrim dismisses — platform convention for filter/option sheets.
 */
export function Sheet({ open, onClose, title, children, actions }: OverlayProps) {
  const ref = useNativeDialog(open, onClose)
  return (
    <dialog
      ref={ref}
      className={s.sheet}
      aria-label={title}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <header className={s.head}>
        <h2 className={s.title}>{title}</h2>
        <IconButton label="Close" onClick={onClose}>
          <X />
        </IconButton>
      </header>
      <div className={s.body}>{children}</div>
      {actions && <footer className={s.foot}>{actions}</footer>}
    </dialog>
  )
}
