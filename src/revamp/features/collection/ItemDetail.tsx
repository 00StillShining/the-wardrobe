import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import s from './collection.module.css'
import p from '../../app/routes/placeholders.module.css'
import {
  Button,
  ConfirmDialog,
  Dialog,
  EmptyState,
  InlineError,
  Skeleton,
  TextField,
  useToast,
} from '../../shared/ui'
import { useBackend } from '../../app/backend'
import { useItemImage } from './CollectionView'
import type { WardrobeItem } from '../../data/types'

export function ItemDetail() {
  const { itemId = '' } = useParams()
  const backend = useBackend()
  const toast = useToast()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const item = useQuery({
    queryKey: ['wardrobe', 'item', itemId],
    queryFn: () => backend.wardrobe.get(itemId),
  })
  const image = useItemImage(itemId, 'display')

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['wardrobe'] })
  }

  const archive = useMutation({
    mutationFn: () => backend.wardrobe.archive(itemId),
    onSuccess: () => {
      invalidate()
      toast('Moved to the archive')
    },
    onError: () => toast('Archiving failed — try again.', { tone: 'danger' }),
  })

  const remove = useMutation({
    mutationFn: () => backend.wardrobe.softDelete(itemId),
    onSuccess: () => {
      invalidate()
      toast('Deleted', { tone: 'danger' })
      navigate('/app/collection')
    },
    onError: () => toast('Deleting failed — try again.', { tone: 'danger' }),
  })

  if (item.isPending) {
    return (
      <div className={s.detail}>
        <Skeleton height={260} radius="m" />
        <Skeleton height="1.4rem" width="50%" radius="s" />
        <Skeleton height="0.9rem" width="30%" radius="s" />
      </div>
    )
  }

  if (item.isError) {
    return (
      <div className={s.detail}>
        <InlineError>The item could not be loaded.</InlineError>
        <Button onClick={() => item.refetch()}>Retry</Button>
      </div>
    )
  }

  if (!item.data) {
    return (
      <EmptyState
        title="This item is gone"
        hint="It may have been deleted, or the link is stale."
        action={
          <Button onClick={() => navigate('/app/collection')} variant="primary">
            Back to Collection
          </Button>
        }
      />
    )
  }

  const it = item.data

  return (
    <div className={s.detail}>
      <div className={s.backRow}>
        <Link to="/app/collection" className={s.tileMeta}>
          <ArrowLeft size={14} aria-hidden /> Collection
        </Link>
      </div>

      <div className={s.detailImage}>
        {image.isPending ? <Skeleton height={260} radius="m" /> : image.data ? <img src={image.data} alt={it.name} /> : <span>No image</span>}
      </div>

      <div className={s.identity}>
        <h2>{it.name}</h2>
        <p>
          {[it.brand, it.category, it.ownershipStatus].filter(Boolean).join(' · ')}
        </p>
      </div>

      <dl className={s.fields}>
        <div className={s.field}>
          <dt>Category</dt>
          <dd>{it.category}</dd>
        </div>
        <div className={s.field}>
          <dt>Layer</dt>
          <dd>{it.layerType}</dd>
        </div>
        <div className={s.field}>
          <dt>Price paid</dt>
          <dd>{it.pricePaid != null ? `${it.currency ?? 'GBP'} ${it.pricePaid}` : '—'}</dd>
        </div>
        <div className={s.field}>
          <dt>Wear count</dt>
          <dd>{it.wearCount ?? 0}</dd>
        </div>
        {it.palette && it.palette.length > 0 && (
          <div className={s.field}>
            <dt>Palette</dt>
            <dd>
              <span className={s.swatches}>
                {it.palette.map((hex) => (
                  <span key={hex} className={s.swatch} style={{ background: hex }} title={hex} />
                ))}
              </span>
            </dd>
          </div>
        )}
      </dl>

      <div className={s.commands}>
        <Button variant="primary" onClick={() => setEditOpen(true)}>
          Edit
        </Button>
        <Button onClick={() => archive.mutate()} loading={archive.isPending} disabled={it.ownershipStatus === 'archived'}>
          {it.ownershipStatus === 'archived' ? 'Archived' : 'Archive'}
        </Button>
        <Button variant="danger" onClick={() => setDeleteOpen(true)}>
          Delete
        </Button>
      </div>
      <p className={p.phase}>Outfits, boards and wear history connect here in Phases 6–8.</p>

      <EditDialog open={editOpen} onClose={() => setEditOpen(false)} item={it} onSaved={invalidate} />
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => remove.mutate()}
        title="Delete this garment?"
        body="The record and its images are removed from your wardrobe. Prefer Archive for ordinary tidying — this cannot be undone."
        confirmLabel="Delete garment"
        danger
      />
    </div>
  )
}

function EditDialog({
  open,
  onClose,
  item,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  item: WardrobeItem
  onSaved: () => void
}) {
  const backend = useBackend()
  const toast = useToast()
  const [name, setName] = useState(item.name)
  const [brand, setBrand] = useState(item.brand ?? '')
  const [price, setPrice] = useState(item.pricePaid != null ? String(item.pricePaid) : '')
  const [error, setError] = useState<string | null>(null)

  const save = useMutation({
    mutationFn: async () => {
      const trimmed = name.trim()
      if (!trimmed) throw new Error('Name is required.')
      const priceNum = price.trim() === '' ? null : Number(price)
      if (priceNum !== null && !Number.isFinite(priceNum)) throw new Error('Enter a price like 240.00.')
      return backend.wardrobe.update(
        item.id,
        { name: trimmed, brand: brand.trim() || undefined, pricePaid: priceNum },
        item.version,
      )
    },
    onSuccess: () => {
      onSaved()
      toast('Saved', { tone: 'success' })
      onClose()
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Saving failed.'),
  })

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Edit garment"
      actions={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={save.isPending} onClick={() => save.mutate()}>
            Save
          </Button>
        </>
      }
    >
      <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} />
      <TextField label="Brand" value={brand} onChange={(e) => setBrand(e.target.value)} />
      <TextField label="Price paid" value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" />
      {error && <InlineError>{error}</InlineError>}
    </Dialog>
  )
}
