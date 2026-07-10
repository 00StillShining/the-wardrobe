import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import type { PriceListing, WardrobeItem } from '../data/types'
import { useItems } from '../state/items'
import { samplePriceAdapter } from '../adapters/prices/PriceAdapter'
import { showSampleData } from '../config/runtime'

interface Entry {
  item: WardrobeItem
  listings: PriceListing[]
  history: number[]
  lowest: number
  saving: number // pricePaid − lowest (positive = you'd save)
  checkedAt: string
}

type Sort = 'saving' | 'name'

/** A pen-drawn price-history line — honest points, ink stroke, nib dot at now. */
function Sparkline({ points }: { points: number[] }) {
  const w = 116
  const h = 40
  const pad = 4
  const { min, max } = useMemo(() => {
    return { min: Math.min(...points), max: Math.max(...points) }
  }, [points])
  const span = Math.max(1, max - min)
  const path = points
    .map((v, i) => {
      const x = pad + (i / (points.length - 1)) * (w - pad * 2)
      const y = pad + (1 - (v - min) / span) * (h - pad * 2 - 8)
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  const lastX = w - pad
  const lastY = pad + (1 - (points[points.length - 1] - min) / span) * (h - pad * 2 - 8)
  return (
    <svg className="sparkline" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="12-week price history">
      <path d={path} fill="none" stroke="#3a332a" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r={2.4} fill="var(--oxblood)" />
      <text className="cap" x={0} y={h - 1}>
        12-week price
      </text>
    </svg>
  )
}

export function Ledger() {
  const items = useItems((s) => s.items)
  const [entries, setEntries] = useState<Entry[] | null>(() => (showSampleData ? null : []))
  const [sort, setSort] = useState<Sort>('saving')

  // Only owned items with a price paid make a ledger entry.
  const priced = useMemo(() => items.filter((i) => i.owned && i.pricePaid != null), [items])

  useEffect(() => {
    if (!showSampleData) {
      setEntries([])
      return
    }

    let alive = true
    ;(async () => {
      const built = await Promise.all(
        priced.map(async (item): Promise<Entry> => {
          const [listings, history] = await Promise.all([
            samplePriceAdapter.getListings(item.id, item.pricePaid),
            samplePriceAdapter.getHistory(item.id, item.pricePaid),
          ])
          const lowest = Math.min(...listings.map((l) => l.price))
          const cheapest = listings.find((l) => l.price === lowest)!
          return {
            item,
            listings: [...listings].sort((a, b) => a.price - b.price),
            history,
            lowest,
            saving: (item.pricePaid ?? 0) - lowest,
            checkedAt: cheapest.checkedAt,
          }
        }),
      )
      if (alive) setEntries(built)
    })()
    return () => {
      alive = false
    }
  }, [priced])

  const sorted = useMemo(() => {
    if (!entries) return []
    const e = [...entries]
    if (sort === 'saving') e.sort((a, b) => b.saving - a.saving)
    else e.sort((a, b) => a.item.name.localeCompare(b.item.name))
    return e
  }, [entries, sort])

  return (
    <motion.div
      className="ledger paper"
      initial={{ opacity: 0, x: '-50%', y: 14 }}
      animate={{ opacity: 1, x: '-50%', y: 0 }}
      exit={{ opacity: 0, x: '-50%', y: 14 }}
      transition={{ duration: 0.4, ease: [0.32, 0.94, 0.6, 1] }}
    >
      <div className="ledger-head">
        <div>
          <h2 className="paper-serif">The Ledger</h2>
          <div className="sub">{showSampleData ? 'Illustrative comparisons from sample retailer data' : 'Live retailer tracking is not connected'}</div>
        </div>
        <div className="ledger-sort" role="group" aria-label="Ledger sort order">
          <span>Sort</span>
          <button type="button" className={sort === 'saving' ? 'on' : ''} aria-pressed={sort === 'saving'} onClick={() => setSort('saving')}>
            By saving
          </button>
          <button type="button" className={sort === 'name' ? 'on' : ''} aria-pressed={sort === 'name'} onClick={() => setSort('name')}>
            A–Z
          </button>
        </div>
      </div>

      <div className="ledger-scroll">
        {!entries && <div className="importing-note" style={{ justifyContent: 'center', padding: '22px 0' }}>Preparing sample comparisons…</div>}
        {!showSampleData && <div className="empty">Live price comparisons will appear when a retail provider is connected.</div>}
        {showSampleData && entries?.length === 0 && <div className="empty">Add a price to a piece to include it in the ledger.</div>}
        {sorted.map((e) => (
          <div className="ledger-entry" key={e.item.id}>
            <div className="le-top">
              <div>
                <div className="le-name">
                  {e.item.name} <span style={{ color: '#8a8070', fontStyle: 'italic', fontSize: 13 }}>— {e.item.brand}</span>
                </div>
                <div className="le-paid">
                  Paid £{e.item.pricePaid?.toFixed(0)} · Owned
                </div>
              </div>
              <Sparkline points={e.history} />
            </div>

            <div className="le-listings">
              {e.listings.map((l) => {
                const low = l.price === e.lowest
                return (
                  <div className={`le-row ${low ? 'low' : ''}`} key={l.shop}>
                    <span className="shop">{l.shop}</span>
                    <span className="dots" />
                    <span className="amt">£{l.price}</span>
                    {low && <span className="lowtag">Lowest</span>}
                  </div>
                )
              })}
            </div>

            <div className="le-foot">
              {e.saving > 0 ? (
                <>
                  <span className="save">Sample saving £{e.saving}</span> · sampled {e.checkedAt}
                </>
              ) : (
                <>
                  <span className="best">Best price in sample</span> · sampled {e.checkedAt}
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
