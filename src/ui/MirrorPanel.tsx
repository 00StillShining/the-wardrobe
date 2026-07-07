import { motion } from 'framer-motion'
import { useItems } from '../state/items'
import { useTryOn, LAYER_SLOT } from '../state/tryOn'
import { useNav } from '../state/navigation'
import { useObjectUrl } from '../hooks/useObjectUrl'
import type { WardrobeItem } from '../data/types'

function WornRow({ item }: { item: WardrobeItem }) {
  const url = useObjectUrl(item.images.cutout)
  const doff = useTryOn((s) => s.toggleWorn)
  return (
    <div className="worn-row">
      {url ? <img src={url} alt={item.name} /> : <span style={{ width: 34 }} />}
      <span className="wn">
        <div className="nm">{item.name}</div>
        <div className="br">
          {item.brand}
          {!item.owned && <span className="wish"> · wishlist</span>}
        </div>
      </span>
      <span className="wp">£{item.pricePaid ?? 0}</span>
      <button className="doff" title="Take off" onClick={() => doff(item.id)}>
        ×
      </button>
    </div>
  )
}

/** The outfit swing-tag — what the form is wearing, totalled. */
export function MirrorPanel() {
  const worn = useTryOn((s) => s.worn)
  const items = useItems((s) => s.items)
  const navigate = useNav((s) => s.navigate)

  const wornItems = worn
    .map((id) => items.find((i) => i.id === id))
    .filter((i): i is WardrobeItem => !!i)
    .sort((a, b) => LAYER_SLOT[a.template] - LAYER_SLOT[b.template])
  const total = wornItems.reduce((s, i) => s + (i.pricePaid ?? 0), 0)

  return (
    <motion.div
      className="outfit paper"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.35, ease: [0.32, 0.94, 0.6, 1] }}
    >
      <h2 className="paper-serif">The Outfit</h2>
      <div className="sub">{wornItems.length ? `${wornItems.length} in this look` : 'No look yet'}</div>

      {wornItems.length === 0 ? (
        <div className="empty">
          Nothing on yet. Pick garments on the Rail, tick a few, and choose <em>Try on</em> — they'll compose into a look here.
        </div>
      ) : (
        <>
          {wornItems.map((item) => (
            <WornRow key={item.id} item={item} />
          ))}
          <div className="total">
            <span className="lbl">Outfit total</span>
            <span className="amt">£{total}</span>
          </div>
          <div className="hint-line">× to take a piece off · add more from the rail</div>
        </>
      )}

      <button className="btn btn-ghost" style={{ marginTop: 4 }} onClick={() => navigate('rail')}>
        Back to the rail
      </button>
    </motion.div>
  )
}
