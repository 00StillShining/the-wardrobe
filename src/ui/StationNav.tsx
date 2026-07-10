import { motion } from 'framer-motion'
import { useNav } from '../state/navigation'
import { STATION_ORDER, STATIONS } from '../scene/stations'

/**
 * Side navigation — the six functional stations as a left-edge menu, numbered
 * to match the 2D mockup (Rail 01 … Post 06). The Doors (overview) is reached
 * by clicking the wordmark. Shown once the doors are open.
 */
export function StationNav() {
  const station = useNav((s) => s.station)
  const navigate = useNav((s) => s.navigate)
  const items = STATION_ORDER.filter((id) => id !== 'doors')

  return (
    <motion.nav
      className="station-nav"
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -8 }}
      transition={{ duration: 0.4, ease: [0.32, 0.94, 0.6, 1] }}
    >
      {items.map((id) => {
        const n = STATION_ORDER.indexOf(id) // rail = 1 … post = 6
        return (
          <button type="button" key={id} className={`snav ${station === id ? 'on' : ''}`} aria-current={station === id ? 'page' : undefined} onClick={() => navigate(id)}>
            <span className="num">{String(n).padStart(2, '0')}</span>
            <span className="lbl">{STATIONS[id].name.replace(/^The /, '')}</span>
          </button>
        )
      })}
    </motion.nav>
  )
}
