import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Layers } from 'lucide-react'
import s from './outfits.module.css'
import { Button, EmptyState, Menu, Skeleton, useToast } from '../../shared/ui'
import { useBackend } from '../../app/backend'
import type { Outfit } from '../../data/types'

function OutfitCard({ outfit }: { outfit: Outfit }) {
  const backend = useBackend()
  const cover = useQuery({
    queryKey: ['outfitCover', outfit.id, outfit.coverImagePath],
    queryFn: () =>
      outfit.coverImagePath ? backend.media.getObjectUrl('derivatives', outfit.coverImagePath) : Promise.resolve(null),
  })
  return (
    <Link to={`/app/outfits/${outfit.id}`} className={s.outfitCard}>
      <span className={s.outfitCover}>{cover.data ? <img src={cover.data} alt="" /> : <Layers aria-hidden />}</span>
      <span className={s.outfitName}>{outfit.name}</span>
      <span className={s.outfitMeta}>{[outfit.occasion, outfit.season].filter(Boolean).join(' · ') || '—'}</span>
    </Link>
  )
}

export function OutfitsList() {
  const backend = useBackend()
  const toast = useToast()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const outfits = useQuery({ queryKey: ['outfits'], queryFn: () => backend.outfits.list() })

  const duplicate = useMutation({
    mutationFn: (id: string) => backend.outfits.duplicate(id),
    onSuccess: (copy) => {
      queryClient.invalidateQueries({ queryKey: ['outfits'] })
      toast('Duplicated', { tone: 'success' })
      navigate(`/app/outfits/${copy.id}`)
    },
  })

  const remove = useMutation({
    mutationFn: (id: string) => backend.outfits.softDelete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outfits'] })
      toast('Outfit deleted', { tone: 'danger' })
    },
  })

  if (outfits.isPending) {
    return (
      <div className={s.outfitGrid}>
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} height={170} radius="m" />
        ))}
      </div>
    )
  }

  if (!outfits.data || outfits.data.length === 0) {
    return (
      <EmptyState
        figure={<Layers aria-hidden />}
        title="No outfits yet"
        hint="Assemble your first look from the garments in your collection."
        action={
          <Button variant="primary" onClick={() => navigate('/app/outfits/new')}>
            New outfit
          </Button>
        }
      />
    )
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-4)' }}>
        <Button variant="primary" onClick={() => navigate('/app/outfits/new')}>
          New outfit
        </Button>
      </div>
      <div className={s.outfitGrid}>
        {outfits.data.map((o) => (
          <div key={o.id} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            <OutfitCard outfit={o} />
            <Menu
              trigger="Actions"
              items={[
                { label: 'Duplicate', onSelect: () => duplicate.mutate(o.id) },
                { label: 'Delete', onSelect: () => remove.mutate(o.id), danger: true },
              ]}
            />
          </div>
        ))}
      </div>
    </>
  )
}
