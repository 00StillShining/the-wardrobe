import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import s from './insights.module.css'
import { Button, EmptyState, Segmented, Skeleton } from '../../shared/ui'
import { useBackend } from '../../app/backend'
import { useCollectionFilters } from '../collection/filterStore'
import { BarList, CadenceColumns, Figure, SwatchRow } from './charts'
import {
  byWear,
  categoryDistribution,
  colorDistribution,
  costPerWear,
  counts,
  incompleteItems,
  notWornSince,
  purchaseCadence,
  recordedValue,
} from './metrics'

type Period = '90' | '365' | 'all'

export function InsightsView() {
  const backend = useBackend()
  const navigate = useNavigate()
  const [period, setPeriod] = useState<Period>('365')

  const items = useQuery({
    queryKey: ['wardrobe', 'list', 'insights'],
    queryFn: () => backend.wardrobe.list({ sort: 'newest' }),
  })

  if (items.isPending) {
    return (
      <div>
        <Skeleton height="4rem" width="70%" radius="m" />
      </div>
    )
  }
  if (items.isError || !items.data) {
    return <EmptyState title="Insights could not load" action={<Button onClick={() => items.refetch()}>Retry</Button>} />
  }

  const data = items.data
  const c = counts(data)

  if (c.total === 0) {
    return (
      <EmptyState
        title="Not enough data yet"
        hint="Insights are computed from your real wardrobe only — no sample retailer data, ever. Add garments first."
        action={
          <Button variant="primary" onClick={() => navigate('/app/import')}>
            Add a garment
          </Button>
        }
      />
    )
  }

  const nowIso = new Date().toISOString()
  const sinceIso =
    period === 'all' ? '1970-01-01T00:00:00Z' : new Date(Date.now() - Number(period) * 86400000).toISOString()
  const value = recordedValue(data)
  const wishValue = recordedValue(data, 'wishlist')
  const stale = notWornSince(data, sinceIso)
  const cpw = costPerWear(data)
  const incomplete = incompleteItems(data)

  function drillTo(patch: Parameters<ReturnType<typeof useCollectionFilters.getState>['set']>[0]) {
    const f = useCollectionFilters.getState()
    f.reset()
    f.set({ ...patch, scrollTop: 0 })
    navigate('/app/collection')
  }

  return (
    <div>
      <div className={s.stats}>
        <div className={s.stat}>
          <span className={s.statValue}>{c.owned}</span>
          <span className={s.statLabel}>Owned pieces</span>
        </div>
        <div className={s.stat}>
          <span className={s.statValue}>
            {value.currency} {value.total.toLocaleString()}
          </span>
          <span className={s.statLabel}>Recorded purchase value</span>
          {value.missingPriceCount > 0 && (
            <span className={s.statNote}>
              {value.missingPriceCount} piece{value.missingPriceCount === 1 ? '' : 's'} without a price — total is
              incomplete
            </span>
          )}
        </div>
        <div className={s.stat}>
          <span className={s.statValue}>{c.wishlist}</span>
          <span className={s.statLabel}>Wishlist pieces</span>
          {wishValue.total > 0 && (
            <span className={s.statNote}>
              {wishValue.currency} {wishValue.total.toLocaleString()} recorded
            </span>
          )}
        </div>
      </div>

      <Segmented
        label="Period"
        value={period}
        onChange={setPeriod}
        options={[
          { value: '90', label: '90 days' },
          { value: '365', label: 'Year' },
          { value: 'all', label: 'All time' },
        ]}
      />

      <Figure title="By category">
        <BarList title="Owned pieces by category" buckets={categoryDistribution(data)} />
      </Figure>

      <Figure title="Colour" note="extracted from your garment photos">
        <SwatchRow title="Owned pieces by dominant colour" buckets={colorDistribution(data)} />
      </Figure>

      <Figure title="Purchase cadence" note="items with a recorded purchase date">
        <CadenceColumns
          title="Purchases per month"
          buckets={purchaseCadence(data, period === '90' ? 3 : 12, nowIso)}
        />
      </Figure>

      <Figure title="Wear">
        <div className={s.itemList}>
          {byWear(data, 'most', 3).map((i) => (
            <Link key={i.id} to={`/app/collection/${i.id}`} className={s.itemRow}>
              <span>{i.name}</span>
              <span className={s.itemRowMeta}>{i.wearCount ?? 0} wears</span>
            </Link>
          ))}
        </div>
        {cpw.length > 0 ? (
          <div className={s.itemList}>
            {cpw.slice(0, 3).map(({ item, costPerWear: v }) => (
              <Link key={item.id} to={`/app/collection/${item.id}`} className={s.itemRow}>
                <span>{item.name}</span>
                <span className={s.itemRowMeta}>
                  {item.currency ?? 'GBP'} {v} / wear
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className={s.itemRowMeta}>Cost per wear appears once pieces have both a price and wear history.</p>
        )}
        <div className={s.drill}>
          <Button variant="quiet" onClick={() => drillTo({ ownership: 'owned', sort: 'mostWorn' })}>
            Open in Collection →
          </Button>
        </div>
      </Figure>

      <Figure
        title={`Not worn in ${period === 'all' ? 'recorded history' : period === '90' ? '90 days' : 'a year'}`}
        note={`${stale.length} piece${stale.length === 1 ? '' : 's'}`}
      >
        <div className={s.itemList}>
          {stale.slice(0, 5).map((i) => (
            <Link key={i.id} to={`/app/collection/${i.id}`} className={s.itemRow}>
              <span>{i.name}</span>
              <span className={s.itemRowMeta}>{i.lastWornAt ? `last ${i.lastWornAt.slice(0, 10)}` : 'never worn'}</span>
            </Link>
          ))}
        </div>
      </Figure>

      {incomplete.length > 0 && (
        <Figure title="Complete your records" note="totals stay honest when prices and dates are filled in">
          <div className={s.itemList}>
            {incomplete.map((i) => (
              <Link key={i.id} to={`/app/collection/${i.id}`} className={s.itemRow}>
                <span>{i.name}</span>
                <span className={s.itemRowMeta}>
                  {[i.pricePaid == null && 'no price', !i.purchasedAt && 'no purchase date'].filter(Boolean).join(' · ')}
                </span>
              </Link>
            ))}
          </div>
        </Figure>
      )}
    </div>
  )
}
