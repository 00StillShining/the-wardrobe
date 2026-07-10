import { useId, type InputHTMLAttributes } from 'react'
import s from './Checkbox.module.css'

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'id'> {
  label: string
}

export function Checkbox({ label, className, ...rest }: CheckboxProps) {
  const id = useId()
  return (
    <span className={[s.wrap, className].filter(Boolean).join(' ')}>
      <input id={id} type="checkbox" className={s.box} {...rest} />
      <label htmlFor={id} className={s.label}>
        {label}
      </label>
    </span>
  )
}

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'id' | 'role'> {
  label: string
}

export function Switch({ label, className, ...rest }: SwitchProps) {
  const id = useId()
  return (
    <span className={[s.wrap, className].filter(Boolean).join(' ')}>
      <input id={id} type="checkbox" role="switch" className={s.switch} {...rest} />
      <label htmlFor={id} className={s.label}>
        {label}
      </label>
    </span>
  )
}
