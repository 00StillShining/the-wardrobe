import { forwardRef, type ButtonHTMLAttributes } from 'react'
import s from './IconButton.module.css'

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible name — required; also becomes the tooltip. */
  label: string
  touch?: boolean
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, touch = false, className, children, type, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type ?? 'button'}
      aria-label={label}
      title={label}
      className={[s.iconbtn, touch && s.touch, className].filter(Boolean).join(' ')}
      {...rest}
    >
      {children}
    </button>
  )
})
