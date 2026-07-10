import { motion } from 'framer-motion'
import { useItems, type Filter } from '../state/items'

const OPTS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'owned', label: 'Owned' },
  { key: 'wishlist', label: 'Wishlist' },
]

/** Isolate owned vs wishlist garments on the rail. */
export function FilterToggle() {
  const filter = useItems((s) => s.filter)
  const setFilter = useItems((s) => s.setFilter)
  return (
    <motion.div
      className="filter-toggle"
      role="group"
      aria-label="Garment filter"
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.3 }}
    >
      {OPTS.map((o) => (
        <button type="button" key={o.key} className={filter === o.key ? 'on' : ''} aria-pressed={filter === o.key} onClick={() => setFilter(o.key)}>
          {o.label}
        </button>
      ))}
    </motion.div>
  )
}
