import { useId } from 'react'
import s from './Segmented.module.css'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
}

export interface SegmentedProps<T extends string> {
  /** Accessible name for the group, e.g. "View" */
  label: string
  options: SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  disabled?: boolean
}

/** Single-choice segmented control (radiogroup semantics via native radios). */
export function Segmented<T extends string>({ label, options, value, onChange, disabled }: SegmentedProps<T>) {
  const name = useId()
  return (
    <fieldset className={s.group} disabled={disabled} aria-label={label}>
      {options.map((opt) => (
        <label key={opt.value} className={s.seg} data-checked={opt.value === value || undefined}>
          <input
            className={s.radio}
            type="radio"
            name={name}
            value={opt.value}
            checked={opt.value === value}
            onChange={() => onChange(opt.value)}
          />
          {opt.label}
        </label>
      ))}
    </fieldset>
  )
}
