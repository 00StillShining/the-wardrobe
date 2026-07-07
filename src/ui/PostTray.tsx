import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { RawReceipt, ParsedReceipt, ReceiptLineItem, Category, GarmentTemplate, WardrobeItem } from '../data/types'
import { mockEmailAdapter } from '../adapters/email/EmailAdapter'
import { parseReceipt } from '../adapters/email/parse'
import { useItems } from '../state/items'
import { illustrateToBlob, type ShapeKey } from '../scene/garments/illustrate'
import { workerImageAdapter } from '../adapters/images/ImageAdapter'
import { localStorageAdapter } from '../adapters/storage/StorageAdapter'

type View = { kind: 'list' } | { kind: 'receipt'; parsed: ParsedReceipt } | { kind: 'manual' }

export function PostTray() {
  const [scanned, setScanned] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [receipts, setReceipts] = useState<RawReceipt[]>([])
  const [view, setView] = useState<View>({ kind: 'list' })
  const [confirming, setConfirming] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)
  const importLine = useItems((s) => s.importLine)

  useEffect(() => {
    if (!flash) return
    const id = window.setTimeout(() => setFlash(null), 2600)
    return () => window.clearTimeout(id)
  }, [flash])

  const scan = async () => {
    setScanning(true)
    const list = await mockEmailAdapter.listReceipts()
    // let the envelopes animate in over a beat
    await new Promise((r) => setTimeout(r, 450))
    setReceipts(list)
    setScanned(true)
    setScanning(false)
  }

  const open = (raw: RawReceipt) => setView({ kind: 'receipt', parsed: parseReceipt(raw) })

  const confirm = async (parsed: ParsedReceipt) => {
    setConfirming(true)
    let added = 0
    for (const line of parsed.items) {
      const item = await importLine(line as ReceiptLineItem, parsed.id)
      if (item) added++
    }
    setConfirming(false)
    setReceipts((rs) => rs.filter((r) => r.id !== parsed.id))
    setView({ kind: 'list' })
    setFlash(added === 1 ? '1 piece hung on the rail' : `${added} pieces hung on the rail`)
  }

  return (
    <motion.div
      className="posttray paper"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.35, ease: [0.32, 0.94, 0.6, 1] }}
    >
      <h2 className="paper-serif">The Post Tray</h2>
      <div className="sub">Receipts become garments</div>

      {!scanned && (
        <div className="row">
          <button className="btn btn-primary" onClick={scan} disabled={scanning}>
            {scanning ? 'Scanning…' : 'Scan for receipts'}
          </button>
        </div>
      )}

      <>
        {view.kind === 'list' && scanned && (
          <motion.div key="list" className="scroll" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {receipts.length === 0 && (
              <div className="importing-note" style={{ justifyContent: 'center', padding: '18px 0' }}>
                Inbox clear — every receipt filed.
              </div>
            )}
            {receipts.map((r, i) => (
              <motion.div
                key={r.id}
                className="envelope"
                onClick={() => open(r)}
                initial={{ opacity: 0, x: 26, rotate: -2 }}
                animate={{ opacity: 1, x: 0, rotate: 0 }}
                transition={{ delay: i * 0.06, duration: 0.4, ease: [0.32, 0.94, 0.6, 1] }}
              >
                <span className="seal" />
                <span className="meta">
                  <span className="from">{r.from.split('@')[1]?.split('.')[0] ?? r.from}</span>
                  <span className="subj">{r.subject}</span>
                </span>
                <span className="date">{r.receivedAt.slice(5)}</span>
              </motion.div>
            ))}
          </motion.div>
        )}

        {view.kind === 'receipt' && (
          <motion.div
            key={'r-' + view.parsed.id}
            className="receipt"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {view.parsed.items.length > 0 ? (
              <>
                <div className="merchant">{view.parsed.merchant}</div>
                <div className="rdate">Order · {view.parsed.date}</div>
                {view.parsed.items.map((it, i) => (
                  <div className="line-item" key={i}>
                    <img src={it.imageUrl} alt={it.name} />
                    <span>
                      <div className="li-name">{it.name}</div>
                      <div className="li-brand">{it.brand}</div>
                    </span>
                    <span className="li-price">£{it.price.toFixed(0)}</span>
                  </div>
                ))}
                <div className="row">
                  <button className="btn btn-primary" onClick={() => confirm(view.parsed)} disabled={confirming}>
                    {confirming ? 'Removing backgrounds…' : `Confirm · hang ${view.parsed.items.length}`}
                  </button>
                  <button className="btn btn-ghost" onClick={() => setView({ kind: 'list' })} disabled={confirming}>
                    Back
                  </button>
                </div>
              </>
            ) : (
              <div className="errcard">
                <div className="ic">⁓</div>
                <p>We couldn't read this receipt. The itemised list wasn't in the email.</p>
                <div className="row">
                  <button className="btn btn-primary" onClick={() => setView({ kind: 'manual' })}>
                    Add manually
                  </button>
                  <button className="btn btn-ghost" onClick={() => setView({ kind: 'list' })}>
                    Back
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {view.kind === 'manual' && <ManualAdd key="manual" onDone={(msg) => (setView({ kind: 'list' }), setFlash(msg))} onCancel={() => setView({ kind: 'list' })} />}
      </>

      <AnimatePresence>
        {flash && (
          <motion.div
            className="importing-note"
            style={{ justifyContent: 'center' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {flash}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* —— minimal manual-add form (uses the same pipeline via a default illustration) —— */

const CATEGORY_SHAPE: Record<Category, { shape: ShapeKey; template: GarmentTemplate; colors: string[] }> = {
  top: { shape: 'polo-knit', template: 'knit', colors: ['#6a5540', '#e8dcc2', '#43331f'] },
  bottom: { shape: 'wide-trousers', template: 'pants', colors: ['#4a4a50', '#5a5a60', '#2c2c30'] },
  dress: { shape: 'dress', template: 'dress', colors: ['#6a3b3a', '#7d4746', '#4c1c17'] },
  outerwear: { shape: 'wool-coat', template: 'coat', colors: ['#8a6f48', '#a5895f', '#5e4a30'] },
  shoes: { shape: 'mary-jane', template: 'prop', colors: ['#6e4a2c', '#875e3a', '#4a301b'] },
  bag: { shape: 'tote-bag', template: 'prop', colors: ['#4a4632', '#5a563f', '#332f20'] },
  accessory: { shape: 'sunglasses', template: 'prop', colors: ['#3f2a1a', '#7a5a3a', '#241811'] },
}

function ManualAdd({ onDone, onCancel }: { onDone: (msg: string) => void; onCancel: () => void }) {
  const [name, setName] = useState('')
  const [brand, setBrand] = useState('')
  const [price, setPrice] = useState('')
  const [category, setCategory] = useState<Category>('top')
  const [owned, setOwned] = useState(true)
  const [busy, setBusy] = useState(false)

  const add = async () => {
    if (!name) return
    setBusy(true)
    const spec = CATEGORY_SHAPE[category]
    const id = `item-${crypto.randomUUID().slice(0, 8)}`
    const original = await illustrateToBlob(spec.shape, spec.colors)
    const { cutout, palette } = await workerImageAdapter.process(original)
    await localStorageAdapter.putBlob(`orig:${id}`, original)
    await localStorageAdapter.putBlob(`cut:${id}`, cutout)
    const item: WardrobeItem = {
      id,
      name,
      brand: brand || 'Added by hand',
      category,
      template: spec.template,
      owned,
      images: { original: `orig:${id}`, cutout: `cut:${id}` },
      palette,
      pricePaid: price ? parseFloat(price) : undefined,
      currency: 'GBP',
      source: { merchant: brand || 'Manual', addedAt: new Date().toISOString().slice(0, 10) },
    }
    const items = [...useItems.getState().items, item]
    localStorageAdapter.writeJSON('items', items)
    useItems.setState({ items })
    setBusy(false)
    onDone(`${name} added`)
  }

  return (
    <motion.div className="receipt" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
      <div className="merchant">Add manually</div>
      <div className="rdate">A quick entry for anything the scanner missed</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
        <input className="mfield" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="mfield" placeholder="Brand" value={brand} onChange={(e) => setBrand(e.target.value)} />
        <input className="mfield" placeholder="Price paid" value={price} onChange={(e) => setPrice(e.target.value)} />
        <select className="mfield" value={category} onChange={(e) => setCategory(e.target.value as Category)}>
          {(['top', 'bottom', 'dress', 'outerwear', 'shoes', 'bag', 'accessory'] as Category[]).map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: '#6b6355' }}>
          <input type="checkbox" checked={owned} onChange={(e) => setOwned(e.target.checked)} /> Owned (uncheck for wishlist)
        </label>
      </div>
      <div className="row">
        <button className="btn btn-primary" onClick={add} disabled={busy || !name}>
          {busy ? 'Adding…' : 'Add to wardrobe'}
        </button>
        <button className="btn btn-ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
      </div>
    </motion.div>
  )
}
