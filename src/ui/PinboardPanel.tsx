import { motion } from 'framer-motion'
import type { StyleSheet } from '../data/types'
import { useSheets } from '../state/sheets'
import { useItems } from '../state/items'
import { useSelection } from '../state/selection'
import { useObjectUrl } from '../hooks/useObjectUrl'

function SheetCard({ sheet }: { sheet: StyleSheet }) {
  const url = useObjectUrl(sheet.exportPng)
  const open = useSheets((s) => s.open)
  return (
    <button type="button" className="sheet-card" onClick={() => open(sheet.id)} aria-label={`Open style sheet: ${sheet.title}`}>
      {url && <img src={url} alt="" />}
      <span className="cap">{sheet.title}</span>
    </button>
  )
}

/** The Pinboard station — start a new sheet or reopen a pinned one. */
export function PinboardPanel() {
  const sheets = useSheets((s) => s.sheets)
  const items = useItems((s) => s.items)
  const selected = useSelection((s) => s.selected)
  const newFromItems = useSheets((s) => s.newFromItems)

  const start = () => {
    const chosen = items.filter((i) => selected.has(i.id))
    // fall back to a handful of owned pieces so a new sheet is never blank
    const seed = chosen.length ? chosen : items.filter((i) => i.owned).slice(0, 5)
    newFromItems(seed)
  }

  return (
    <motion.div
      className="pinboard paper"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.35, ease: [0.32, 0.94, 0.6, 1] }}
    >
      <h2 className="paper-serif">The Pinboard</h2>
      <div className="sub">Saved looks and compositions</div>

      <button type="button" className="btn btn-primary" onClick={start} disabled={items.length === 0}>
        {selected.size ? `New sheet from ${selected.size} selected` : 'New style sheet'}
      </button>

      {sheets.length === 0 ? (
        <div className="empty">{items.length ? 'No style sheets yet.' : 'Add a piece before creating a style sheet.'}</div>
      ) : (
        <div className="sheet-grid">
          {sheets.map((s) => (
            <SheetCard key={s.id} sheet={s} />
          ))}
        </div>
      )}
    </motion.div>
  )
}
