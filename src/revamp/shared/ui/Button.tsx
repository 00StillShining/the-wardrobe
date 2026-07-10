import { forwardRef, type ButtonHTMLAttributes } from 'react'
import s from './Button.module.css'

export type ButtonVariant = 'primary' | 'ghost' | 'quiet' | 'danger'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  /** 44px control height for touch surfaces */
  touch?: boolean
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'ghost', touch = false, loading = false, disabled, className, children, type, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type ?? 'button'}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={[s.btn, s[variant], touch && s.touch, loading && s.loading, className]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </button>
  )
})
