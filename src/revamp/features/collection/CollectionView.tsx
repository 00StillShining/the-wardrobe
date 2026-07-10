import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import s from './collection.module.css'
import { Button, EmptyState, Menu, Segmented, Skeleton, TextField, InlineError } from '../../shared/ui'
import { useBackend } from '../../app/backend'
import type { Backend, WardrobeSort } from '../../services/contracts'
import type { WardrobeItem } from '../../data/types'

type Ownership = 'all' | 'owned' | 'wishlist'

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

function Tile({ item }: { item: WardrobeItem }) {
  const image = useItemImage(item.id, 'thumbnail')
  return (
    <Link to={`/app/collection/${item.id}`} className={s.tile}>
      <span className={s.tileImage}>
        {image.isPending ? (
          <Skeleton height={150} radius="m" />
        ) : image.data ? (
          <img src={image.data} alt="" loading="lazy" />
        ) : (
          <span aria-hidden>—</span>
        )}
      </span>
      <span className={s.tileName}>{item.name}</span>
      <span className={s.tileMeta}>
        {item.brand && <span>{item.brand}</span>}
        {item.ownershipStatus === 'wishlist' && <span className={s.wishlistBadge}>Wishlist</span>}
        {item.ownershipStatus === 'archived' && <span className={s.wishlistBadge}>Archived</span>}
      </span>
    </Link>
  )
}

export function listParams(search: string, ownership: Ownership, sort: WardrobeSort): Parameters<Backend['wardrobe']['list']>[0] {
  return {
    search: search.trim() || undefined,
    ownershipStatus: ownership === 'all' ? undefined : ownership,
    sort,
  }
}

export function CollectionView() {
  const backend = useBackend()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [ownership, setOwnership] = useState<Ownership>('all')
  const [sort, setSort] = useState<WardrobeSort>('newest')

  const items = useQuery({
    queryKey: ['wardrobe', 'list', search, ownership, sort],
    queryFn: () => backend.wardrobe.list(listParams(search, ownership, sort)),
  })

  const hasFilters = search.trim() !== '' || ownership !== 'all'

  return (
    <>
      <div className={s.toolbar}>
        <TextField
          label="Search"
          placeholder="Name, brand, notes…"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className={s.toolbarRow}>
          <Segmented
            label="Ownership"
            value={ownership}
            onChange={setOwnership}
            options={[
              { value: 'all', label: 'All' },
              { value: 'owned', label: 'Owned' },
              { value: 'wishlist', label: 'Wishlist' },
            ]}
          />
          <Menu
            trigger={`Sort · ${sort === 'newest' ? 'Newest' : sort === 'name' ? 'Name' : sort === 'lastWorn' ? 'Recently worn' : 'Most worn'}`}
            items={[
              { label: 'Newest', onSelect: () => setSort('newest') },
              { label: 'Name', onSelect: () => setSort('name') },
              { label: 'Recently worn', onSelect: () => setSort('lastWorn') },
              { label: 'Most worn', onSelect: () => setSort('mostWorn') },
            ]}
          />
        </div>
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

      {items.data && items.data.length === 0 && !hasFilters && (
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

      {items.data && items.data.length === 0 && hasFilters && (
        <EmptyState
          title="No matches"
          hint="Nothing in the wardrobe matches these filters."
          action={
            <Button
              onClick={() => {
                setSearch('')
                setOwnership('all')
              }}
            >
              Clear filters
            </Button>
          }
        />
      )}

      {items.data && items.data.length > 0 && (
        <div className={s.grid}>
          {items.data.map((item) => (
            <Tile key={item.id} item={item} />
          ))}
        </div>
      )}
    </>
  )
}
