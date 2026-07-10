import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react'
import s from './Field.module.css'

interface FieldChrome {
  label: string
  hint?: string
  error?: string
}

function useFieldIds(error?: string, hint?: string) {
  const id = useId()
  // the hint node renders only when there is no error — describedBy must match
  const describedBy =
    [error ? `${id}-err` : null, hint && !error ? `${id}-hint` : null]
      .filter(Boolean)
      .join(' ') || undefined
  return { id, describedBy }
}

function Chrome({
  id,
  label,
  hint,
  error,
  children,
}: FieldChrome & { id: string; children: ReactNode }) {
  return (
    <div className={s.field}>
      <label className={s.label} htmlFor={id}>
        {label}
      </label>
      {children}
      {hint && !error && (
        <p className={s.hint} id={`${id}-hint`}>
          {hint}
        </p>
      )}
      {error && (
        <p className={s.error} id={`${id}-err`} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

export interface TextFieldProps extends FieldChrome, Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {}

export function TextField({ label, hint, error, className, ...rest }: TextFieldProps) {
  const { id, describedBy } = useFieldIds(error, hint)
  return (
    <Chrome id={id} label={label} hint={hint} error={error}>
      <input
        id={id}
        className={[s.input, error && s.invalid, className].filter(Boolean).join(' ')}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...rest}
      />
    </Chrome>
  )
}

export interface SelectFieldProps
  extends FieldChrome,
    Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> {
  children: ReactNode
}

export function SelectField({ label, hint, error, className, children, ...rest }: SelectFieldProps) {
  const { id, describedBy } = useFieldIds(error, hint)
  return (
    <Chrome id={id} label={label} hint={hint} error={error}>
      <span className={s.selectwrap}>
        <select
          id={id}
          className={[s.input, s.select, error && s.invalid, className].filter(Boolean).join(' ')}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...rest}
        >
          {children}
        </select>
      </span>
    </Chrome>
  )
}
