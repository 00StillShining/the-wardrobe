import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import s from './Toast.module.css'
import { IconButton } from './IconButton'
import { X } from 'lucide-react'

export interface ToastOptions {
  tone?: 'neutral' | 'success' | 'danger'
  /** ms before auto-dismiss; important failures should live inline instead (plan §9.10) */
  duration?: number
}

interface ToastRecord extends Required<ToastOptions> {
  id: number
  message: string
}

const ToastContext = createContext<((message: string, opts?: ToastOptions) => void) | null>(null)

export function useToast() {
  const push = useContext(ToastContext)
  if (!push) throw new Error('useToast must be used inside <ToastProvider>')
  return push
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([])
  const nextId = useRef(1)
  const timers = useRef(new Map<number, number>())

  const dismiss = useCallback((id: number) => {
    const t = timers.current.get(id)
    if (t) window.clearTimeout(t)
    timers.current.delete(id)
    setToasts((list) => list.filter((x) => x.id !== id))
  }, [])

  const arm = useCallback(
    (rec: ToastRecord) => {
      timers.current.set(
        rec.id,
        window.setTimeout(() => dismiss(rec.id), rec.duration),
      )
    },
    [dismiss],
  )

  const pause = useCallback((id: number) => {
    const t = timers.current.get(id)
    if (t) window.clearTimeout(t)
    timers.current.delete(id)
  }, [])

  const push = useCallback(
    (message: string, opts?: ToastOptions) => {
      const rec: ToastRecord = {
        id: nextId.current++,
        message,
        tone: opts?.tone ?? 'neutral',
        duration: opts?.duration ?? 5000,
      }
      setToasts((list) => [...list.slice(-3), rec])
      arm(rec)
    },
    [arm],
  )

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className={s.viewport}>
        {toasts.map((t) => (
          // each toast is its own status region so only insertions announce
          <div
            key={t.id}
            role="status"
            className={[s.toast, s[t.tone]].join(' ')}
            onPointerEnter={() => pause(t.id)}
            onPointerLeave={() => arm(t)}
            onFocusCapture={() => pause(t.id)}
            onBlurCapture={() => arm(t)}
          >
            <span className={s.msg}>{t.message}</span>
            <IconButton label="Dismiss" onClick={() => dismiss(t.id)}>
              <X />
            </IconButton>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
