import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, Eye, EyeOff, X } from 'lucide-react'
import s from './outfits.module.css'
import { Button, EmptyState, IconButton, InlineError, SelectField, Skeleton, TextField, useToast } from '../../shared/ui'
import { useBackend } from '../../app/backend'
import { useItemImage } from '../collection/CollectionView'
import { useOutfitEditor, type EditorLayer } from './editorStore'
import { BAND, conflictsWith, slotFor, slotIndex } from './layerModel'
import { renderOutfitCover } from './renderCover'
import { OCCASION_OPTIONS, SEASON_OPTIONS } from '../collection/filterStore'
import type { WardrobeItem } from '../../data/types'

function CompositionLayer({ layer, item }: { layer: EditorLayer; item: WardrobeItem | undefined }) {
  const image = useItemImage(layer.itemId, 'display')
  if (!item || layer.hidden || !image.data) return null
  const band = BAND[layer.layerSlot]
  return (
    <div
      className={s.compLayer}
      style={{ top: `${band.top * 100}%`, height: `${band.height * 100}%`, zIndex: slotIndex(layer.layerSlot) * 10 + layer.sortOrder }}
      data-wishlist={item.ownershipStatus === 'wishlist' || undefined}
    >
      <img src={image.data} alt="" />
    </div>
  )
}

function TrayTile({ item, disabled, onAdd }: { item: WardrobeItem; disabled: boolean; onAdd: () => void }) {
  const image = useItemImage(item.id, 'thumbnail')
  return (
    <button type="button" className={s.trayTile} disabled={disabled} onClick={onAdd} title={`Add ${item.name}`}>
      <span className={s.trayImg}>{image.data ? <img src={image.data} alt="" /> : <span aria-hidden>—</span>}</span>
      <span className={s.trayName}>{item.name}</span>
    </button>
  )
}

export function OutfitStudio() {
  const { outfitId } = useParams()
  const backend = useBackend()
  const toast = useToast()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const editor = useOutfitEditor()
  const [error, setError] = useState<string | null>(null)

  const items = useQuery({
    queryKey: ['wardrobe', 'list', 'studio'],
    queryFn: () => backend.wardrobe.list({ sort: 'newest' }),
  })
  const byId = useMemo(() => new Map((items.data ?? []).map((i) => [i.id, i])), [items.data])

  // load an existing outfit, or start fresh
  useEffect(() => {
    let live = true
    if (!outfitId) {
      editor.load(null, 'New outfit', [])
      return
    }
    Promise.all([backend.outfits.get(outfitId), backend.outfits.listItems(outfitId)]).then(([outfit, outfitItems]) => {
      if (!live || !outfit) return
      editor.load(
        outfit.id,
        outfit.name,
        outfitItems.map((oi, idx) => ({
          itemId: oi.itemId,
          layerSlot: (oi.layerSlot as EditorLayer['layerSlot']) ?? 'accessory',
          sortOrder: oi.sortOrder ?? idx,
        })),
        { occasion: outfit.occasion ?? '', season: outfit.season ?? '' },
      )
    })
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outfitId, backend])

  const ordered = useMemo(
    () => [...editor.layers].sort((a, b) => slotIndex(a.layerSlot) - slotIndex(b.layerSlot) || a.sortOrder - b.sortOrder),
    [editor.layers],
  )

  const ownedValue = useMemo(() => {
    let total = 0
    let wishlist = 0
    for (const layer of editor.layers) {
      const item = byId.get(layer.itemId)
      if (!item) continue
      if (item.ownershipStatus === 'wishlist') wishlist++
      else if (item.pricePaid != null) total += item.pricePaid
    }
    return { total: Math.round(total * 100) / 100, wishlist }
  }, [editor.layers, byId])

  function addItem(item: WardrobeItem) {
    setError(null)
    const slot = slotFor(item)
    const conflict = conflictsWith(slot, editor.layers)
    if (conflict) {
      setError(conflict)
      return
    }
    const inSlot = editor.layers.filter((l) => l.layerSlot === slot)
    editor.apply([...editor.layers, { itemId: item.id, layerSlot: slot, sortOrder: inSlot.length }])
  }

  function removeLayer(itemId: string) {
    editor.apply(editor.layers.filter((l) => l.itemId !== itemId))
  }

  function toggleHidden(itemId: string) {
    editor.apply(editor.layers.map((l) => (l.itemId === itemId ? { ...l, hidden: !l.hidden } : l)))
  }

  function move(itemId: string, dir: -1 | 1) {
    const idx = ordered.findIndex((l) => l.itemId === itemId)
    const target = ordered[idx + dir]
    if (!target || target.layerSlot !== ordered[idx].layerSlot) return
    editor.apply(
      editor.layers.map((l) => {
        if (l.itemId === itemId) return { ...l, sortOrder: target.sortOrder }
        if (l.itemId === target.itemId) return { ...l, sortOrder: ordered[idx].sortOrder }
        return l
      }),
    )
  }

  const save = useMutation({
    mutationFn: async () => {
      const name = editor.name.trim() || 'Untitled outfit'
      const meta = { name, occasion: editor.occasion || null, season: editor.season || null }
      const itemInputs = editor.layers.map((l) => ({
        itemId: l.itemId,
        layerSlot: l.layerSlot,
        sortOrder: l.sortOrder,
      }))
      let id = editor.outfitId
      if (id) {
        await backend.outfits.update(id, meta)
        await backend.outfits.setItems(id, itemInputs)
      } else {
        const outfit = await backend.outfits.create(meta, itemInputs)
        id = outfit.id
      }
      // deterministic cover from the visible layers
      try {
        const urls = await Promise.all(
          ordered
            .filter((l) => !l.hidden)
            .map(async (l) => {
              const images = await backend.itemImages.listForItem(l.itemId)
              const img = images.find((i) => i.kind === 'display') ?? images.find((i) => i.kind === 'cutout')
              return img
                ? { url: await backend.media.getObjectUrl('derivatives', img.storagePath), layerSlot: l.layerSlot }
                : null
            }),
        )
        const cover = await renderOutfitCover(urls.filter((u): u is NonNullable<typeof u> => u !== null))
        const path = await backend.media.upload({
          bucket: 'derivatives',
          key: `outfits/${id}/cover.webp`,
          blob: cover,
          contentType: 'image/webp',
          upsert: true,
        })
        await backend.outfits.update(id, { coverImagePath: path })
      } catch {
        // a failed cover never sinks the save
      }
      return id
    },
    onSuccess: (id) => {
      editor.markSaved(id!)
      queryClient.invalidateQueries({ queryKey: ['outfits'] })
      toast('Outfit saved', { tone: 'success' })
      if (!outfitId) navigate(`/app/outfits/${id}`, { replace: true })
    },
    onError: () => toast('Saving failed — try again.', { tone: 'danger' }),
  })

  const logWorn = useMutation({
    mutationFn: () =>
      backend.wear.logWear({
        wornAt: new Date().toISOString(),
        outfitId: editor.outfitId,
        itemIds: editor.layers.map((l) => l.itemId),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wardrobe'] })
      toast('Logged as worn today', { tone: 'success' })
    },
    onError: () => toast('Could not log the wear.', { tone: 'danger' }),
  })

  if (items.isPending) return <Skeleton height={380} radius="m" />

  const tray = (items.data ?? []).filter((i) => i.ownershipStatus !== 'archived')
  const inOutfit = new Set(editor.layers.map((l) => l.itemId))

  return (
    <div className={s.studio}>
      <div className={s.metaRow}>
        <TextField label="Name" value={editor.name} onChange={(e) => editor.setMeta({ name: e.target.value })} />
        <SelectField label="Occasion" value={editor.occasion} onChange={(e) => editor.setMeta({ occasion: e.target.value })}>
          <option value="">—</option>
          {OCCASION_OPTIONS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </SelectField>
        <SelectField label="Season" value={editor.season} onChange={(e) => editor.setMeta({ season: e.target.value })}>
          <option value="">—</option>
          {SEASON_OPTIONS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </SelectField>
      </div>

      <div className={s.composition} aria-label="Outfit composition">
        {ordered.length === 0 && (
          <span className={s.compEmpty}>Add pieces from the tray below — they layer into a flat editorial look.</span>
        )}
        {ordered.map((layer) => (
          <CompositionLayer key={layer.itemId} layer={layer} item={byId.get(layer.itemId)} />
        ))}
      </div>

      <p className={s.valueNote}>
        Recorded value of owned pieces: GBP {ownedValue.total.toLocaleString()}
        {ownedValue.wishlist > 0 && ` · ${ownedValue.wishlist} wishlist piece${ownedValue.wishlist === 1 ? '' : 's'} not counted`}
      </p>

      {error && <InlineError>{error}</InlineError>}

      <div className={s.layerList} aria-label="Layers">
        {ordered.map((layer) => {
          const item = byId.get(layer.itemId)
          return (
            <div key={layer.itemId} className={s.layerRow} data-hidden={layer.hidden || undefined}>
              <span className={s.layerName}>
                <span>{item?.name ?? 'Missing item'}</span>
                <span className={s.layerSlot}>{layer.layerSlot}</span>
              </span>
              <span className={s.layerBtns}>
                <IconButton label="Move up" onClick={() => move(layer.itemId, -1)}>
                  <ArrowUp />
                </IconButton>
                <IconButton label="Move down" onClick={() => move(layer.itemId, 1)}>
                  <ArrowDown />
                </IconButton>
                <IconButton label={layer.hidden ? 'Show' : 'Hide'} onClick={() => toggleHidden(layer.itemId)}>
                  {layer.hidden ? <EyeOff /> : <Eye />}
                </IconButton>
                <IconButton label="Remove" onClick={() => removeLayer(layer.itemId)}>
                  <X />
                </IconButton>
              </span>
            </div>
          )
        })}
      </div>

      <div className={s.commandRow}>
        <Button variant="primary" loading={save.isPending} onClick={() => save.mutate()}>
          {editor.dirty ? 'Save outfit' : 'Saved'}
        </Button>
        <Button onClick={() => editor.undo()} disabled={editor.past.length === 0}>
          Undo
        </Button>
        <Button onClick={() => editor.redo()} disabled={editor.future.length === 0}>
          Redo
        </Button>
        <Button variant="quiet" onClick={() => editor.clear()} disabled={editor.layers.length === 0}>
          Clear
        </Button>
        {editor.outfitId && (
          <Button
            onClick={() => logWorn.mutate()}
            loading={logWorn.isPending}
            disabled={editor.layers.length === 0 || editor.dirty}
            title={editor.dirty ? 'Save first' : undefined}
          >
            Log worn today
          </Button>
        )}
      </div>

      <h3>Garment tray</h3>
      {tray.length === 0 ? (
        <EmptyState title="No garments to add" hint="Add pieces in Add / Import first." />
      ) : (
        <div className={s.tray} aria-label="Garment tray">
          {tray.map((item) => (
            <TrayTile key={item.id} item={item} disabled={inOutfit.has(item.id)} onAdd={() => addItem(item)} />
          ))}
        </div>
      )}
    </div>
  )
}
