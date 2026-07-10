import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import s from './Menu.module.css'

export interface MenuItem {
  label: string
  onSelect: () => void
  danger?: boolean
  disabled?: boolean
}

export interface MenuProps {
  /** The trigger content, e.g. "Sort by" or an ellipsis icon */
  trigger: ReactNode
  /**
   * Accessible name override — ONLY for icon triggers. With a text trigger,
   * omit it so the accessible name matches the visible label (WCAG 2.5.3).
   */
  label?: string
  items: MenuItem[]
}

const MENU_WIDTH = 180 // matches .list min-width for edge clamping

/**
 * Action/option menu. The list renders position:fixed at the measured trigger
 * rect (clamped to the viewport) so it never clips inside overflow containers.
 * Outside interactions close it via document pointerdown — the underlying
 * control still receives the click. Scroll or resize while open closes it.
 */
export function Menu({ trigger, label, items }: MenuProps) {
  const id = useId()
  const btnRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  function openMenu() {
    const r = btnRef.current!.getBoundingClientRect()
    setPos({
      top: r.bottom + 4,
      left: Math.max(8, Math.min(r.left, window.innerWidth - MENU_WIDTH - 8)),
    })
    setOpen(true)
    requestAnimationFrame(() => {
      const first = listRef.current?.querySelector<HTMLElement>('[role="menuitem"]:not([aria-disabled])')
      first?.focus()
    })
  }

  function close(returnFocus = true) {
    setOpen(false)
    if (returnFocus) btnRef.current?.focus()
  }

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node
      if (listRef.current?.contains(t) || btnRef.current?.contains(t)) return
      setOpen(false) // no focus steal — the click proceeds to its real target
    }
    const onScroll = () => close(false)
    const onResize = () => close(false)
    document.addEventListener('pointerdown', onPointerDown)
    // capture-phase so scrolls inside the workspace <main> are seen too
    window.addEventListener('scroll', onScroll, { capture: true, passive: true })
    window.addEventListener('resize', onResize)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('scroll', onScroll, { capture: true })
      window.removeEventListener('resize', onResize)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function onListKeyDown(e: KeyboardEvent) {
    const nodes = Array.from(
      listRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([aria-disabled])') ?? [],
    )
    const idx = nodes.indexOf(document.activeElement as HTMLElement)
    if (e.key === 'Escape') {
      e.preventDefault()
      close()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      nodes[(idx + 1) % nodes.length]?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      nodes[(idx - 1 + nodes.length) % nodes.length]?.focus()
    } else if (e.key === 'Home') {
      e.preventDefault()
      nodes[0]?.focus()
    } else if (e.key === 'End') {
      e.preventDefault()
      nodes[nodes.length - 1]?.focus()
    } else if (e.key === 'Tab') {
      // APG: Tab closes the menu and continues from the trigger (no preventDefault)
      btnRef.current?.focus()
      setOpen(false)
    }
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={s.trigger}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-label={label}
        onClick={() => (open ? close() : openMenu())}
      >
        {trigger}
        <span className={s.chevron} aria-hidden />
      </button>
      {open && (
        <div
          ref={listRef}
          id={id}
          role="menu"
          className={s.list}
          style={{ top: pos.top, left: pos.left }}
          onKeyDown={onListKeyDown}
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              aria-disabled={item.disabled || undefined}
              className={[s.item, item.danger && s.danger].filter(Boolean).join(' ')}
              onClick={() => {
                if (item.disabled) return
                close()
                item.onSelect()
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </>
  )
}
