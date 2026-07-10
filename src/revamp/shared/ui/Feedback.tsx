import type { CSSProperties, ReactNode } from 'react'
import s from './Feedback.module.css'
import { AlertCircle } from 'lucide-react'

export interface SkeletonProps {
  /** Reserve the final dimensions so nothing shifts on load (plan §9.10). */
  width?: number | string
  height?: number | string
  radius?: 's' | 'm' | 'l'
  className?: string
}

export function Skeleton({ width, height = '1rem', radius = 'm', className }: SkeletonProps) {
  const style: CSSProperties = { width, height }
  return <span className={[s.skeleton, s[`r_${radius}`], className].filter(Boolean).join(' ')} style={style} aria-hidden />
}

export interface EmptyStateProps {
  title: string
  hint?: string
  /** The next useful command, not a feature tour */
  action?: ReactNode
  figure?: ReactNode
}

export function EmptyState({ title, hint, action, figure }: EmptyStateProps) {
  return (
    <div className={s.empty}>
      {figure && <div className={s.figure}>{figure}</div>}
      <h3 className={s.emptyTitle}>{title}</h3>
      {hint && <p className={s.emptyHint}>{hint}</p>}
      {action && <div className={s.emptyAction}>{action}</div>}
    </div>
  )
}

export function InlineError({ children }: { children: ReactNode }) {
  return (
    <p className={s.inlineError} role="alert">
      <AlertCircle aria-hidden />
      <span>{children}</span>
    </p>
  )
}
