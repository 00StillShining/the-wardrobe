import { motion, AnimatePresence } from 'framer-motion'
import { useSelection } from '../state/selection'
import { useItems } from '../state/items'
import { useNav } from '../state/navigation'
import { useTryOn } from '../state/tryOn'
import { useObjectUrl } from '../hooks/useObjectUrl'
import type { WardrobeItem } from '../data/types'

function Thumb({ item }: { item: WardrobeItem }) {
  const url = useObjectUrl(item.images.cutout)
  return url ? <img src={url} alt={item.name} /> : <span style={{ width: 34 }} />
}

/** Small toggle to enter multi-select on the rail. */
export function SelectModeToggle() {
  const selectMode = useSelection((s) => s.selectMode)
  const toggle = useSelection((s) => s.toggleSelectMode)
  return (
    <motion.button
      className="filter-toggle"
      style={{ left: 'auto', right: 34, top: 82, padding: '6px 14px', cursor: 'pointer' }}
      onClick={toggle}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.3 }}
    >
      <span className={selectMode ? 'on' : ''} style={{ padding: '4px 10px', borderRadius: 2, fontSize: 11, letterSpacing: '0.14em', fontVariantCaps: 'all-small-caps', fontWeight: 600 }}>
        {selectMode ? 'Done' : 'Select'}
      </span>
    </motion.button>
  )
}

/** The linen tray that rises when garments are selected — path into Try-on & Sheets. */
export function SelectionTray() {
  const selected = useSelection((s) => s.selected)
  const items = useItems((s) => s.items)
  const clear = useSelection((s) => s.clearSelected)
  const navigate = useNav((s) => s.navigate)

  const chosen = items.filter((i) => selected.has(i.id))
  const total = chosen.reduce((s, i) => s + (i.pricePaid ?? 0), 0)

  return (
    <AnimatePresence>
      {chosen.length > 0 && (
        <motion.div
          className="seltray paper"
          initial={{ opacity: 0, x: '-50%', y: 40 }}
          animate={{ opacity: 1, x: '-50%', y: 0 }}
          exit={{ opacity: 0, x: '-50%', y: 40 }}
          transition={{ duration: 0.4, ease: [0.32, 0.94, 0.6, 1] }}
        >
          <span className="count">
            {chosen.length} selected · £{total.toFixed(0)}
          </span>
          <span className="thumbs">
            {chosen.slice(0, 6).map((it) => (
              <Thumb key={it.id} item={it} />
            ))}
          </span>
          <button
            className="btn btn-ghost"
            onClick={() => {
              useTryOn.getState().setWorn([...selected])
              navigate('mirror')
            }}
          >
            Try on
          </button>
          <button className="btn btn-primary" style={{ flex: 'none' }} onClick={() => navigate('pinboard')}>
            New style sheet
          </button>
          <button className="btn btn-ghost" onClick={clear}>
            Clear
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
