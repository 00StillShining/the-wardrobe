import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, ArrowLeft, CheckCircle2, ImagePlus, Inbox, LoaderCircle, Plus, X } from 'lucide-react'
import type { RawReceipt, ParsedReceipt, ReceiptLineItem, Category, GarmentTemplate } from '../data/types'
import { sampleEmailAdapter } from '../adapters/email/EmailAdapter'
import { parseReceipt } from '../adapters/email/parse'
import { useItems } from '../state/items'
import { illustrateToBlob, type ShapeKey } from '../scene/garments/illustrate'
import { showSampleData } from '../config/runtime'

type View = { kind: 'list' } | { kind: 'receipt'; parsed: ParsedReceipt } | { kind: 'manual' }

export function PostTray({ startManual = false, onManualOpened }: { startManual?: boolean; onManualOpened?: () => void }) {
  const [scanned, setScanned] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [receipts, setReceipts] = useState<RawReceipt[]>([])
  const [view, setView] = useState<View>(startManual ? { kind: 'manual' } : { kind: 'list' })
  const [confirming, setConfirming] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const importLine = useItems((s) => s.importLine)

  useEffect(() => {
    if (!startManual) return
    setView({ kind: 'manual' })
    onManualOpened?.()
  }, [onManualOpened, startManual])

  useEffect(() => {
    if (!flash) return
    const id = window.setTimeout(() => setFlash(null), 2600)
    return () => window.clearTimeout(id)
  }, [flash])

  const scan = async () => {
    setScanning(true)
    setError(null)
    try {
      const list = await sampleEmailAdapter.listReceipts()
      await new Promise((resolve) => setTimeout(resolve, 450))
      setReceipts(list)
      setScanned(true)
    } catch (cause) {
      console.warn('[receipts] load failed', cause)
      setError('Receipts could not be loaded. Try again.')
    } finally {
      setScanning(false)
    }
  }

  const open = (raw: RawReceipt) => setView({ kind: 'receipt', parsed: parseReceipt(raw) })

  const confirm = async (parsed: ParsedReceipt) => {
    setConfirming(true)
    setError(null)
    let added = 0
    for (const line of parsed.items) {
      const item = await importLine(line as ReceiptLineItem, parsed.id)
      if (item) added++
    }
    setConfirming(false)
    if (added === 0) {
      setError('No pieces were added from this receipt.')
      return
    }
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
      <div className="panel-heading compact">
        <div>
          <span className="panel-kicker">Import</span>
          <h2 className="paper-serif">The Post Tray</h2>
        </div>
        {view.kind !== 'list' && (
          <button type="button" className="icon-button" aria-label="Back to import options" onClick={() => setView({ kind: 'list' })} disabled={confirming}>
            <ArrowLeft size={17} aria-hidden="true" />
          </button>
        )}
      </div>
      <div className="sub">{showSampleData ? 'Add a piece or explore sample receipts' : 'Add purchases to your wardrobe'}</div>

      {view.kind === 'list' && !scanned && (
        <div className="row">
          <button type="button" className="btn btn-primary icon-text-button" onClick={() => setView({ kind: 'manual' })}>
            <Plus size={15} aria-hidden="true" /> Add a piece
          </button>
          {showSampleData && (
            <button type="button" className="btn btn-ghost icon-text-button" onClick={scan} disabled={scanning}>
              {scanning ? <LoaderCircle className="spin" size={14} aria-hidden="true" /> : <Inbox size={14} aria-hidden="true" />}
              {scanning ? 'Loading' : 'Sample receipts'}
            </button>
          )}
        </div>
      )}

      <>
        {view.kind === 'list' && scanned && (
          <motion.div key="list" className="scroll" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {receipts.length === 0 && (
              <div className="receipt-empty">
                <Inbox size={20} aria-hidden="true" />
                <span>Sample inbox clear</span>
                <button type="button" className="btn btn-ghost icon-text-button" onClick={() => setView({ kind: 'manual' })}>
                  <Plus size={14} aria-hidden="true" /> Add a piece
                </button>
              </div>
            )}
            {receipts.map((r, i) => (
              <motion.button
                key={r.id}
                type="button"
                className="envelope"
                onClick={() => open(r)}
                aria-label={`Open receipt: ${r.subject} from ${r.from}, received ${r.receivedAt}`}
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
              </motion.button>
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
                  <button type="button" className="btn btn-primary icon-text-button" onClick={() => confirm(view.parsed)} disabled={confirming}>
                    {confirming ? <LoaderCircle className="spin" size={14} aria-hidden="true" /> : <CheckCircle2 size={14} aria-hidden="true" />}
                    {confirming ? 'Processing' : `Add ${view.parsed.items.length}`}
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => setView({ kind: 'list' })} disabled={confirming}>
                    Back
                  </button>
                </div>
              </>
            ) : (
              <div className="errcard">
                <div className="ic">⁓</div>
                <p>We couldn't read this receipt. The itemised list wasn't in the email.</p>
                <div className="row">
                  <button type="button" className="btn btn-primary" onClick={() => setView({ kind: 'manual' })}>
                    Add manually
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => setView({ kind: 'list' })}>
                    Back
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {view.kind === 'manual' && <ManualAdd key="manual" onDone={(msg) => (setError(null), setView({ kind: 'list' }), setFlash(msg))} onCancel={() => setView({ kind: 'list' })} />}
      </>

      <AnimatePresence>
        {error && (
          <motion.div className="inline-error status-row" role="status" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <AlertCircle size={14} aria-hidden="true" /> {error}
          </motion.div>
        )}
        {flash && (
          <motion.div
            className="success-row"
            style={{ justifyContent: 'center' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <CheckCircle2 size={14} aria-hidden="true" /> {flash}
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
  const [photo, setPhoto] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement | null>(null)
  const addItem = useItems((s) => s.addItem)

  useEffect(() => {
    if (!photo) {
      setPreview(null)
      return
    }
    const url = URL.createObjectURL(photo)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [photo])

  const choosePhoto = (file?: File) => {
    setError(null)
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Choose a JPEG, PNG or WebP image.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('The image must be smaller than 10 MB.')
      return
    }
    setPhoto(file)
  }

  const add = async (event: React.FormEvent) => {
    event.preventDefault()
    const cleanName = name.trim()
    if (!cleanName) {
      setError('Enter a name for this piece.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const spec = CATEGORY_SHAPE[category]
      const original = photo ?? (await illustrateToBlob(spec.shape, spec.colors))
      await addItem(
        {
          name: cleanName,
          brand,
          category,
          template: spec.template,
          owned,
          pricePaid: price ? Number(price) : undefined,
          currency: 'GBP',
          merchant: brand || 'Manual',
        },
        original,
        Boolean(photo),
      )
      onDone(`${cleanName} added`)
    } catch (cause) {
      console.warn('[manual import] failed', cause)
      setError('This piece could not be processed. Try another image or add it without a photo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <motion.form className="manual-form" onSubmit={add} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
      <div className="upload-field">
        <div className={`upload-preview ${preview ? 'has-image' : ''}`}>
          {preview ? <img src={preview} alt="Selected garment" /> : <ImagePlus size={24} aria-hidden="true" />}
        </div>
        <div className="upload-actions">
          <strong>Garment photo <span>optional</span></strong>
          <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => choosePhoto(event.target.files?.[0])} />
          <div>
            <button type="button" className="btn btn-ghost icon-text-button" onClick={() => fileInput.current?.click()} disabled={busy}>
              <ImagePlus size={14} aria-hidden="true" /> {photo ? 'Replace' : 'Choose image'}
            </button>
            {photo && (
              <button type="button" className="icon-button subtle" aria-label="Remove selected image" onClick={() => setPhoto(null)} disabled={busy}>
                <X size={15} aria-hidden="true" />
              </button>
            )}
          </div>
          <small>JPEG, PNG or WebP · 10 MB max</small>
        </div>
      </div>

      <div className="form-grid">
        <label className="field-group full">
          <span>Name</span>
          <input className="mfield" placeholder="Wool overcoat" value={name} maxLength={80} onChange={(event) => setName(event.target.value)} autoFocus />
        </label>
        <label className="field-group full">
          <span>Brand</span>
          <input className="mfield" placeholder="Optional" value={brand} maxLength={80} onChange={(event) => setBrand(event.target.value)} />
        </label>
        <label className="field-group">
          <span>Category</span>
          <select className="mfield category-select" value={category} onChange={(event) => setCategory(event.target.value as Category)}>
            {(['top', 'bottom', 'dress', 'outerwear', 'shoes', 'bag', 'accessory'] as Category[]).map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>
        <label className="field-group">
          <span>Price paid</span>
          <span className="price-field"><span>£</span><input className="mfield" type="number" min="0" step="0.01" inputMode="decimal" placeholder="0" value={price} onChange={(event) => setPrice(event.target.value)} /></span>
        </label>
      </div>

      <label className="setting-row compact-setting">
        <span><strong>Owned</strong><small>Turn off to add it to your wishlist</small></span>
        <input type="checkbox" checked={owned} onChange={(event) => setOwned(event.target.checked)} />
      </label>

      <AnimatePresence>
        {error && <motion.div className="inline-error status-row" role="status" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><AlertCircle size={14} aria-hidden="true" /> {error}</motion.div>}
      </AnimatePresence>

      <div className="row form-actions">
        <button type="submit" className="btn btn-primary icon-text-button" disabled={busy || !name.trim()}>
          {busy ? <LoaderCircle className="spin" size={14} aria-hidden="true" /> : <Plus size={14} aria-hidden="true" />}
          {busy ? 'Creating cutout' : 'Add to wardrobe'}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy}>Cancel</button>
      </div>
    </motion.form>
  )
}
