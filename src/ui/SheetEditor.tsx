import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { SheetElement } from '../data/types'
import { useSheets } from '../state/sheets'
import { useItems } from '../state/items'
import { useObjectUrl } from '../hooks/useObjectUrl'
import { localStorageAdapter, objectUrlFor } from '../adapters/storage/StorageAdapter'
import { renderSheetToBlob } from '../lib/renderSheet'

const SHEET_W = 1000
const SHEET_H = 750
const BASE = { cutout: 240, image: 280, swatch: 88, caption: 30 }

/* —— element renderers —— */

function CutoutEl({ itemId }: { itemId?: string }) {
  const item = useItems((s) => s.items.find((i) => i.id === itemId))
  const url = useObjectUrl(item?.images.cutout)
  if (!url) return <div style={{ width: BASE.cutout, height: BASE.cutout * 1.33 }} />
  return (
    <img
      src={url}
      alt=""
      width={BASE.cutout}
      draggable={false}
      style={{ filter: 'drop-shadow(0 10px 14px rgba(20,14,6,0.28))' }}
    />
  )
}

function ImageEl({ imageKey }: { imageKey?: string }) {
  const url = useObjectUrl(imageKey)
  if (!url) return <div style={{ width: BASE.image, height: BASE.image * 1.2, background: '#e7e2d8' }} />
  return (
    <img
      src={url}
      alt=""
      width={BASE.image}
      draggable={false}
      style={{ borderRadius: 3, boxShadow: '0 12px 22px -10px rgba(20,14,6,0.5)', objectFit: 'cover' }}
    />
  )
}

function ElBody({ el }: { el: SheetElement }) {
  switch (el.kind) {
    case 'cutout':
      return <CutoutEl itemId={el.itemId} />
    case 'image':
      return <ImageEl imageKey={el.imageKey} />
    case 'swatch':
      return <div className="sheet-swatch" style={{ width: BASE.swatch, height: BASE.swatch, background: el.color }} />
    case 'caption':
      return (
        <div className="sheet-caption" style={{ fontSize: BASE.caption }}>
          {el.text}
        </div>
      )
  }
}

/* —— editor —— */

export function SheetEditor() {
  const draft = useSheets((s) => s.draft)
  const { updateEl, commit, close, saveDraft, undo, redo, removeEl, bring, addSwatch, addCaption, addImage, setTitle } =
    useSheets.getState()
  const past = useSheets((s) => s.past.length)
  const future = useSheets((s) => s.future.length)

  const sheetRef = useRef<HTMLDivElement | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [guides, setGuides] = useState<{ v: boolean; h: boolean }>({ v: false, h: false })
  const [exporting, setExporting] = useState(false)
  const [vp, setVp] = useState({ w: window.innerWidth, h: window.innerHeight })
  const fileRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const on = () => setVp({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])

  const fit = useMemo(() => Math.min((vp.w * 0.94) / SHEET_W, (vp.h - 200) / SHEET_H), [vp])

  // drag
  const drag = useRef<{ id: string; sx: number; sy: number; ex: number; ey: number } | null>(null)
  const onElDown = (e: React.PointerEvent, el: SheetElement) => {
    e.stopPropagation()
    setSelected(el.id)
    commit()
    drag.current = { id: el.id, sx: e.clientX, sy: e.clientY, ex: el.x, ey: el.y }
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
  }
  const onElMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    let nx = d.ex + (e.clientX - d.sx) / fit / SHEET_W
    let ny = d.ey + (e.clientY - d.sy) / fit / SHEET_H
    // snap to centre with guides
    const v = Math.abs(nx - 0.5) < 0.012
    const h = Math.abs(ny - 0.5) < 0.012
    if (v) nx = 0.5
    if (h) ny = 0.5
    setGuides({ v, h })
    updateEl(d.id, { x: Math.max(0, Math.min(1, nx)), y: Math.max(0, Math.min(1, ny)) })
  }
  const onElUp = () => {
    drag.current = null
    setGuides({ v: false, h: false })
  }

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault()
        e.shiftKey ? redo() : undo()
      } else if ((e.key === 'Backspace' || e.key === 'Delete') && selected) {
        removeEl(selected)
        setSelected(null)
      } else if (e.key === 'Escape') {
        close()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected, undo, redo, removeEl, close])

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const key = `insp:${Date.now().toString(36)}`
    await localStorageAdapter.putBlob(key, file)
    addImage(key)
    e.target.value = ''
  }

  const onExport = useCallback(async () => {
    const d = useSheets.getState().draft
    if (!d) return
    setExporting(true)
    setSelected(null)
    // resolve object URLs for every raster element, then flatten to a 2× PNG
    const items = useItems.getState().items
    const urls: Record<string, string> = {}
    for (const el of d.elements) {
      const key =
        el.kind === 'cutout' ? items.find((i) => i.id === el.itemId)?.images.cutout : el.kind === 'image' ? el.imageKey : undefined
      if (key) {
        const u = await objectUrlFor(key)
        if (u) urls[el.id] = u
      }
    }
    let blob: Blob | null = null
    try {
      blob = await renderSheetToBlob(d.elements, urls)
    } catch (err) {
      console.warn('[sheet] export failed', err)
    }
    await saveDraft(blob)
    setExporting(false)
  }, [saveDraft])

  if (!draft) return null
  const sel = draft.elements.find((e) => e.id === selected) ?? null
  const els = [...draft.elements].sort((a, b) => a.z - b.z)

  return (
    <div className="sheet-editor" onPointerDown={() => setSelected(null)}>
      <div className="sheet-topbar" onPointerDown={(e) => e.stopPropagation()}>
        <input className="title-in" value={draft.title} onChange={(e) => setTitle(e.target.value)} />
        <div className="sheet-tools">
          <button className="tool" onClick={() => addSwatch(sel?.color ?? '#6e2b24')}>
            + Swatch
          </button>
          <button className="tool" onClick={addCaption}>
            + Text
          </button>
          <button className="tool" onClick={() => fileRef.current?.click()}>
            + Image
          </button>
          <button className="tool" onClick={undo} disabled={!past}>
            Undo
          </button>
          <button className="tool" onClick={redo} disabled={!future}>
            Redo
          </button>
          <button className="tool" onClick={close}>
            Close
          </button>
          <button className="tool primary" onClick={onExport} disabled={exporting}>
            {exporting ? 'Exporting…' : 'Export & pin'}
          </button>
        </div>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onUpload} />
      </div>

      <div className="sheet-stage" style={{ width: SHEET_W * fit, height: SHEET_H * fit }} onPointerDown={(e) => e.stopPropagation()}>
        <div style={{ transform: `scale(${fit})`, transformOrigin: 'top left' }}>
          <div className="sheet" ref={sheetRef} onPointerDown={() => setSelected(null)}>
            {els.map((el) => (
              <div
                key={el.id}
                className={`sheet-el ${selected === el.id && !exporting ? 'sel' : ''}`}
                style={{
                  left: el.x * SHEET_W,
                  top: el.y * SHEET_H,
                  zIndex: el.z,
                  transform: `translate(-50%, -50%) rotate(${el.rotation}deg) scale(${el.scale})`,
                }}
                onPointerDown={(e) => onElDown(e, el)}
                onPointerMove={onElMove}
                onPointerUp={onElUp}
              >
                <ElBody el={el} />
              </div>
            ))}
            {guides.v && <div className="sheet-guide" style={{ left: SHEET_W / 2 - 0.5, top: 0, width: 1, height: SHEET_H }} />}
            {guides.h && <div className="sheet-guide" style={{ top: SHEET_H / 2 - 0.5, left: 0, height: 1, width: SHEET_W }} />}
          </div>
        </div>
      </div>

      <div className="sheet-inspector" onPointerDown={(e) => e.stopPropagation()}>
        {sel ? (
          <>
            <span className="ctl">
              Size
              <input
                type="range"
                min={0.3}
                max={2}
                step={0.02}
                value={sel.scale}
                onPointerDown={commit}
                onChange={(e) => updateEl(sel.id, { scale: parseFloat(e.target.value) })}
              />
            </span>
            <span className="ctl">
              Tilt
              <input
                type="range"
                min={-6}
                max={6}
                step={0.5}
                value={sel.rotation}
                onPointerDown={commit}
                onChange={(e) => updateEl(sel.id, { rotation: parseFloat(e.target.value) })}
              />
            </span>
            {sel.kind === 'caption' && (
              <input
                className="title-in"
                style={{ flex: '0 0 200px', fontStyle: 'italic', fontSize: 14 }}
                value={sel.text ?? ''}
                onChange={(e) => updateEl(sel.id, { text: e.target.value })}
              />
            )}
            <button className="tool" onClick={() => bring(sel.id, 'front')}>
              Front
            </button>
            <button className="tool" onClick={() => bring(sel.id, 'back')}>
              Back
            </button>
            <button className="tool" onClick={() => (removeEl(sel.id), setSelected(null))}>
              Remove
            </button>
          </>
        ) : (
          <span className="sheet-hint">Drag to arrange · click a piece to size, tilt or layer it · ⌘Z to undo</span>
        )}
      </div>
    </div>
  )
}
