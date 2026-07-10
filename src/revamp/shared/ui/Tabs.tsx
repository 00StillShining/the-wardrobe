import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react'
import s from './Tabs.module.css'

export interface Tab {
  id: string
  label: string
  content: ReactNode
}

export interface TabsProps {
  label: string
  tabs: Tab[]
  active: string
  onChange: (id: string) => void
}

export function Tabs({ label, tabs, active, onChange }: TabsProps) {
  const base = useId()
  const listRef = useRef<HTMLDivElement>(null)
  const activeTab = tabs.find((t) => t.id === active) ?? tabs[0]

  function onKeyDown(e: KeyboardEvent) {
    const idx = tabs.findIndex((t) => t.id === activeTab.id)
    let next = -1
    if (e.key === 'ArrowRight') next = (idx + 1) % tabs.length
    if (e.key === 'ArrowLeft') next = (idx - 1 + tabs.length) % tabs.length
    if (e.key === 'Home') next = 0
    if (e.key === 'End') next = tabs.length - 1
    if (next >= 0) {
      e.preventDefault()
      onChange(tabs[next].id)
      const el = listRef.current?.children[next] as HTMLElement | undefined
      el?.focus()
    }
  }

  return (
    <div>
      <div className={s.list} role="tablist" aria-label={label} ref={listRef} onKeyDown={onKeyDown}>
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`${base}-tab-${t.id}`}
            aria-selected={t.id === activeTab.id}
            aria-controls={`${base}-panel-${t.id}`}
            tabIndex={t.id === activeTab.id ? 0 : -1}
            className={s.tab}
            onClick={() => onChange(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`${base}-panel-${activeTab.id}`}
        aria-labelledby={`${base}-tab-${activeTab.id}`}
        className={s.panel}
        tabIndex={0}
      >
        {activeTab.content}
      </div>
    </div>
  )
}
