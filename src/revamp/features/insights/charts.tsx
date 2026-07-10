import type { ReactNode } from 'react'
import s from './insights.module.css'
import type { Bucket, MonthBucket } from './metrics'

/**
 * Accessible single-series charts (dataviz method): one hue — bottle, the
 * ledger ink (contrast 6.85/8.18 on the linen surfaces, validated; the
 * categorical lightness/chroma checks don't apply to a lone fill) — thin
 * marks, text in text tokens, and a real table alternative under every
 * figure. The swatch row's colors ARE the data (garment hexes).
 */

function TableAlt({ caption, head, rows }: { caption: string; head: string[]; rows: (string | number)[][] }) {
  return (
    <details className={s.tableAlt}>
      <summary>View as table</summary>
      <table>
        <caption className="visually-hidden">{caption}</caption>
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h} scope="col">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  )
}

export function Figure({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <figure className={s.figure}>
      <figcaption className={s.figTitle}>
        {title}
        {note && <span className={s.figNote}> — {note}</span>}
      </figcaption>
      {children}
    </figure>
  )
}

export function BarList({ buckets, title }: { buckets: Bucket[]; title: string }) {
  const max = Math.max(1, ...buckets.map((b) => b.count))
  return (
    <>
      <div role="img" aria-label={`${title}: ${buckets.map((b) => `${b.key} ${b.count}`).join(', ')}`}>
        {buckets.map((b) => (
          <div key={b.key} className={s.barRow} title={`${b.key}: ${b.count}`}>
            <span className={s.barLabel}>{b.key}</span>
            <span className={s.barTrack}>
              <span className={s.barFill} style={{ width: `${(b.count / max) * 100}%` }} />
            </span>
            <span className={s.barValue}>{b.count}</span>
          </div>
        ))}
      </div>
      <TableAlt caption={title} head={['Category', 'Count']} rows={buckets.map((b) => [b.key, b.count])} />
    </>
  )
}

export function CadenceColumns({ buckets, title }: { buckets: MonthBucket[]; title: string }) {
  const max = Math.max(1, ...buckets.map((b) => b.count))
  return (
    <>
      <div
        className={s.cadence}
        role="img"
        aria-label={`${title}: ${buckets.map((b) => `${b.month} ${b.count}`).join(', ')}`}
      >
        {buckets.map((b, i) => (
          <div key={b.month} className={s.cadenceCol} title={`${b.month}: ${b.count}`}>
            <span
              className={s.cadenceBar}
              style={{ height: `${Math.max(b.count > 0 ? 8 : 2, (b.count / max) * 72)}px` }}
              data-zero={b.count === 0 || undefined}
            />
            <span className={s.cadenceLabel}>{i % 3 === 0 ? b.month.slice(2).replace('-', '/') : ''}</span>
          </div>
        ))}
      </div>
      <TableAlt caption={title} head={['Month', 'Purchases']} rows={buckets.map((b) => [b.month, b.count])} />
    </>
  )
}

export function SwatchRow({ buckets, title }: { buckets: Bucket[]; title: string }) {
  return (
    <>
      <div className={s.swatchRow} role="img" aria-label={`${title}: ${buckets.map((b) => `${b.key} ${b.count}`).join(', ')}`}>
        {buckets.map((b) => (
          <span key={b.key} className={s.swatchCell} title={`${b.key}: ${b.count}`}>
            <span className={s.swatchChip} style={{ background: b.key }} />
            <span className={s.swatchCount}>{b.count}</span>
          </span>
        ))}
      </div>
      <TableAlt caption={title} head={['Colour', 'Count']} rows={buckets.map((b) => [b.key, b.count])} />
    </>
  )
}
