import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Plus } from 'lucide-react'
import s from './collection.module.css'
import {
  Button,
  Checkbox,
  ConfirmDialog,
  EmptyState,
  InlineError,
  Menu,
  Segmented,
  SelectField,
  Skeleton,
  TextField,
  useToast,
} from '../../shared/ui'
import { useBackend } from '../../app/backend'
import {
  CATEGORY_OPTIONS,
  OCCASION_OPTIONS,
  SEASON_OPTIONS,
  useCollectionFilters,
  type CollectionViewMode,
  type Ownership,
} from './filterStore'
import { useSceneItems, SCENE_GARMENT_CAP } from '../../stores/sceneItems'
import type { WardrobeSort } from '../../services/contracts'
import type { WardrobeItem } from '../../data/types'

const SORT_LABEL: Record<WardrobeSort, string> = {
  newest: 'Newest',
  name: 'Name',
  lastWorn: 'Recently worn',
  mostWorn: 'Most worn',
}

/** Freshest display derivative for an item, as a revocable object URL. */
export function useItemImage(itemId: string, kind: 'thumbnail' | 'display') {
  const backend = useBackend()
  return useQuery({
    queryKey: ['itemImage', itemId, kind],
    queryFn: async () => {
      const images = await backend.itemImages.listForItem(itemId)
      const img =
        images.find((i) => i.kind === kind) ??
        images.find((i) => i.kind === 'display') ??
        images.find((i) => i.kind === 'original')
      if (!img) return null
      const bucket = img.kind === 'original' ? 'originals' : 'derivatives'
      return backend.media.getObjectUrl(bucket, img.storagePath)
    },
    staleTime: 30_000,
  })
}

function TileImage({ itemId, height }: { itemId: string; height: number }) {
  const image = useItemImage(itemId, 'thumbnail')
  return (
    <span className={s.tileImage} style={{ height }}>
      {image.isPending ? (
        <Skeleton height={height} radius="m" />
      ) : image.data ? (
        <img src={image.data} alt="" loading="lazy" />
      ) : (
        <span className={s.noImage} aria-hidden>
          —
        </span>
      )}
    </span>
  )
}

function TileBody({ item }: { item: WardrobeItem }) {
  return (
    <>
      <span className={s.tileName}>{item.name}</span>
      <span className={s.tileMeta}>
        {item.brand && <span>{item.brand}</span>}
        {item.ownershipStatus === 'wishlist' && <span className={s.wishlistBadge}>Wishlist</span>}
        {item.ownershipStatus === 'archived' && <span className={s.wishlistBadge}>Archived</span>}
      </span>
    </>
  )
}

function Tile({
  item,
  imageHeight,
  horizontal,
}: {
  item: WardrobeItem
  imageHeight: number
  horizontal?: boolean
}) {
  const { selectMode, selected, toggleSelected } = useCollectionFilters()
  const cls = [s.tile, horizontal && s.tileRail].filter(Boolean).join(' ')
  if (selectMode) {
    const checked = selected.has(item.id)
    return (
      <button
        type="button"
        className={cls}
        aria-pressed={checked}
        data-selected={checked || undefined}
        onClick={() => toggleSelected(item.id)}
      >
        <TileImage itemId={item.id} height={imageHeight} />
        <TileBody item={item} />
        <span className={s.selectMark} data-checked={checked || undefined} aria-hidden />
      </button>
    )
  }
  return (
    <Link to={`/app/collection/${item.id}`} className={cls}>
      <TileImage itemId={item.id} height={imageHeight} />
      <TileBody item={item} />
    </Link>
  )
}

function ListRow({ item }: { item: WardrobeItem }) {
  const { selectMode, selected, toggleSelected } = useCollectionFilters()
  const inner = (
    <>
      <TileImage itemId={item.id} height={48} />
      <span className={s.listName}>{item.name}</span>
      <span className={s.listMeta}>{item.brand ?? '—'}</span>
      <span className={s.listMeta}>{item.category}</span>
      <span className={s.listMeta}>{item.ownershipStatus}</span>
    </>
  )
  if (selectMode) {
    const checked = selected.has(item.id)
    return (
      <button
        type="button"
        className={s.listRow}
        aria-pressed={checked}
        data-selected={checked || undefined}
        onClick={() => toggleSelected(item.id)}
      >
        {inner}
      </button>
    )
  }
  return (
    <Link to={`/app/collection/${item.id}`} className={s.listRow}>
      {inner}
    </Link>
  )
}

/** Grid virtualized by rows against the shell's scrolling <main>. */
function VirtualGrid({ items }: { items: WardrobeItem[] }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [cols, setCols] = useState(4)
  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      setCols(Math.max(2, Math.floor((el.clientWidth + 16) / 156)))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const rowCount = Math.ceil(items.length / cols)
  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => document.getElementById('main'),
    estimateSize: () => 226,
    overscan: 4,
  })
  return (
    <div ref={wrapRef} style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
      {virtualizer.getVirtualItems().map((row) => (
        <div
          key={row.key}
          className={s.gridRow}
          style={{
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            transform: `translateY(${row.start}px)`,
          }}
        >
          {items.slice(row.index * cols, row.index * cols + cols).map((item) => (
            <Tile key={item.id} item={item} imageHeight={150} />
          ))}
        </div>
      ))}
    </div>
  )
}

function VirtualList({ items }: { items: WardrobeItem[] }) {
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => document.getElementById('main'),
    estimateSize: () => 64,
    overscan: 10,
  })
  return (
    <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
      {virtualizer.getVirtualItems().map((row) => (
        <div key={row.key} className={s.listRowWrap} style={{ transform: `translateY(${row.start}px)` }}>
          <ListRow item={items[row.index]} />
        </div>
      ))}
    </div>
  )
}

/** Rail: a horizontal editorial strip with its own scroll element. */
function VirtualRail({ items }: { items: WardrobeItem[] }) {
  const railRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    horizontal: true,
    count: items.length,
    getScrollElement: () => railRef.current,
    estimateSize: () => 188,
    overscan: 6,
  })
  return (
    <div ref={railRef} className={s.rail} tabIndex={0} aria-label="Garment rail">
      <div style={{ width: virtualizer.getTotalSize(), height: '100%', position: 'relative' }}>
        {virtualizer.getVirtualItems().map((col) => (
          <div key={col.key} className={s.railCell} style={{ transform: `translateX(${col.start}px)` }}>
            <Tile item={items[col.index]} imageHeight={220} horizontal />
          </div>
        ))}
      </div>
    </div>
  )
}

export function CollectionView() {
  const backend = useBackend()
  const navigate = useNavigate()
  const toast = useToast()
  const queryClient = useQueryClient()
  const f = useCollectionFilters()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const items = useQuery({
    queryKey: ['wardrobe', 'list', f.search, f.ownership, f.category, f.season, f.occasion, f.sort],
    queryFn: () =>
      backend.wardrobe.list({
        search: f.search.trim() || undefined,
        ownershipStatus: f.ownership === 'all' ? undefined : f.ownership,
        category: f.category || undefined,
        season: f.season || undefined,
        occasion: f.occasion || undefined,
        sort: f.sort,
      }),
  })

  // restore scroll on return from detail (plan §9.3). Saving happens on the
  // scroll event itself — an unmount save reads a value already clamped by
  // the next route's shorter content.
  useLayoutEffect(() => {
    const main = document.getElementById('main')
    if (!main) return
    if (items.data) main.scrollTop = useCollectionFilters.getState().scrollTop
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() =>
        useCollectionFilters.getState().set({ scrollTop: main.scrollTop }),
      )
    }
    main.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      main.removeEventListener('scroll', onScroll)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.data !== undefined])

  // scene mirrors the current filter with a curated subset
  useEffect(() => {
    if (!items.data) return
    let cancelled = false
    const head = items.data.slice(0, SCENE_GARMENT_CAP)
    Promise.all(
      head.map(async (item) => {
        try {
          const images = await backend.itemImages.listForItem(item.id)
          const img = images.find((i) => i.kind === 'display') ?? images.find((i) => i.kind === 'cutout')
          if (!img) return null
          const url = await backend.media.getObjectUrl('derivatives', img.storagePath)
          return { id: item.id, url }
        } catch {
          return null
        }
      }),
    ).then((garments) => {
      if (!cancelled) useSceneItems.getState().setGarments(garments.filter((g): g is { id: string; url: string } => g !== null))
    })
    return () => {
      cancelled = true
    }
  }, [backend, items.data])

  const bulk = useMutation({
    mutationFn: async (action: 'archive' | 'delete' | 'owned' | 'wishlist') => {
      const ids = [...useCollectionFilters.getState().selected]
      const byId = new Map((items.data ?? []).map((i) => [i.id, i]))
      for (const id of ids) {
        if (action === 'archive') await backend.wardrobe.archive(id)
        else if (action === 'delete') await backend.wardrobe.softDelete(id)
        else {
          const item = byId.get(id)
          if (item) await backend.wardrobe.update(id, { ownershipStatus: action }, item.version)
        }
      }
      return ids.length
    },
    onSuccess: (n, action) => {
      f.clearSelection()
      queryClient.invalidateQueries({ queryKey: ['wardrobe'] })
      toast(
        action === 'delete' ? `${n} deleted` : action === 'archive' ? `${n} archived` : `${n} moved to ${action}`,
        { tone: action === 'delete' ? 'danger' : 'success' },
      )
    },
    onError: () => toast('Bulk action failed part-way — the list is refreshed.', { tone: 'danger', duration: 8000 }),
  })

  const hasFilters = f.activeCount() > 0
  const data = items.data ?? []

  return (
    <>
      <div className={s.toolbar}>
        <TextField
          label="Search"
          placeholder="Name, brand, notes…"
          type="search"
          value={f.search}
          onChange={(e) => f.set({ search: e.target.value })}
        />
        <div className={s.filterRow}>
          <SelectField label="Category" value={f.category} onChange={(e) => f.set({ category: e.target.value })}>
            <option value="">All</option>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c[0].toUpperCase() + c.slice(1)}
              </option>
            ))}
          </SelectField>
          <SelectField label="Season" value={f.season} onChange={(e) => f.set({ season: e.target.value })}>
            <option value="">All</option>
            {SEASON_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c[0].toUpperCase() + c.slice(1)}
              </option>
            ))}
          </SelectField>
          <SelectField label="Occasion" value={f.occasion} onChange={(e) => f.set({ occasion: e.target.value })}>
            <option value="">All</option>
            {OCCASION_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c[0].toUpperCase() + c.slice(1)}
              </option>
            ))}
          </SelectField>
        </div>
        <div className={s.toolbarRow}>
          <Segmented
            label="Ownership"
            value={f.ownership}
            onChange={(v: Ownership) => f.set({ ownership: v })}
            options={[
              { value: 'all', label: 'All' },
              { value: 'owned', label: 'Owned' },
              { value: 'wishlist', label: 'Wishlist' },
              { value: 'archived', label: 'Archived' },
            ]}
          />
          <div className={s.toolbarRight}>
            <Segmented
              label="View"
              value={f.view}
              onChange={(v: CollectionViewMode) => f.set({ view: v })}
              options={[
                { value: 'grid', label: 'Grid' },
                { value: 'rail', label: 'Rail' },
                { value: 'list', label: 'List' },
              ]}
            />
            <Menu
              trigger={`Sort · ${SORT_LABEL[f.sort]}`}
              items={(Object.keys(SORT_LABEL) as WardrobeSort[]).map((key) => ({
                label: SORT_LABEL[key],
                onSelect: () => f.set({ sort: key }),
              }))}
            />
            <Checkbox
              label="Select"
              checked={f.selectMode}
              onChange={(e) => (e.target.checked ? f.set({ selectMode: true }) : f.clearSelection())}
            />
          </div>
        </div>
        {hasFilters && (
          <div className={s.activeRow}>
            <span className={s.activeSummary} role="status">
              {f.activeCount()} active filter{f.activeCount() === 1 ? '' : 's'} · {data.length} match
              {data.length === 1 ? '' : 'es'}
            </span>
            <Button variant="quiet" onClick={() => f.reset()}>
              Clear all
            </Button>
          </div>
        )}
      </div>

      {items.isPending && (
        <div className={s.grid} aria-label="Loading collection">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className={s.tile}>
              <Skeleton height={150} radius="m" />
              <Skeleton height="0.8rem" width="70%" radius="s" />
            </div>
          ))}
        </div>
      )}

      {items.isError && (
        <div>
          <InlineError>The collection could not be loaded.</InlineError>
          <Button onClick={() => items.refetch()}>Retry</Button>
        </div>
      )}

      {items.data && data.length === 0 && !hasFilters && (
        <EmptyState
          figure={<Plus aria-hidden />}
          title="No garments yet"
          hint="Add your first piece with a photo — the cutout is prepared automatically."
          action={
            <Button variant="primary" onClick={() => navigate('/app/import')}>
              Add first item
            </Button>
          }
        />
      )}

      {items.data && data.length === 0 && hasFilters && (
        <EmptyState
          title="No matches"
          hint="Nothing in the wardrobe matches these filters."
          action={<Button onClick={() => f.reset()}>Clear filters</Button>}
        />
      )}

      {data.length > 0 && f.view === 'grid' && <VirtualGrid items={data} />}
      {data.length > 0 && f.view === 'list' && <VirtualList items={data} />}
      {data.length > 0 && f.view === 'rail' && <VirtualRail items={data} />}

      {f.selectMode && f.selected.size > 0 && (
        <div className={s.bulkBar} role="toolbar" aria-label="Bulk actions" data-surface="dark">
          <span className={s.bulkCount}>{f.selected.size} selected</span>
          <Button onClick={() => bulk.mutate('owned')} disabled={bulk.isPending}>
            Owned
          </Button>
          <Button onClick={() => bulk.mutate('wishlist')} disabled={bulk.isPending}>
            Wishlist
          </Button>
          <Button onClick={() => bulk.mutate('archive')} disabled={bulk.isPending}>
            Archive
          </Button>
          <Button variant="danger" onClick={() => setConfirmDelete(true)} disabled={bulk.isPending}>
            Delete
          </Button>
          <Button variant="quiet" onClick={() => f.clearSelection()}>
            Done
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => bulk.mutate('delete')}
        title={`Delete ${f.selected.size} garment${f.selected.size === 1 ? '' : 's'}?`}
        body="They are removed from your wardrobe along with their images. Prefer Archive for ordinary tidying — this cannot be undone."
        confirmLabel="Delete"
        danger
      />
    </>
  )
}
