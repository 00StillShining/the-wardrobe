import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button, InlineError } from '../../shared/ui'
import { useBackend } from '../../app/backend'
import { CATEGORY_OPTIONS, OCCASION_OPTIONS, SEASON_OPTIONS } from './filterStore'

/**
 * Dev/demo-only performance fixture (plan §9.3 gate: 1,000 items stay
 * responsive). Metadata-only on purpose — list/filter/scroll performance is
 * what the gate measures; image-pipeline realism is covered by real imports.
 * Never compiled into production behavior: the component renders nothing
 * unless DEV or VITE_WARDROBE_DEMO === 'true'.
 */

const FIXTURE_BRAND = 'Fixture'
const NAMES = ['Coat', 'Knit', 'Tee', 'Shirt', 'Trousers', 'Skirt', 'Dress', 'Boots', 'Scarf', 'Belt']
const LAYER_FOR: Record<string, string> = {
  outerwear: 'coat',
  knitwear: 'knit',
  tops: 'tee',
  trousers: 'bottom',
  skirts: 'bottom',
  dresses: 'dress',
  shoes: 'shoes',
  accessories: 'accessory',
}

export function SeedControls() {
  const backend = useBackend()
  const queryClient = useQueryClient()
  const [progress, setProgress] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const enabled = import.meta.env.DEV || import.meta.env.VITE_WARDROBE_DEMO === 'true'
  if (!enabled) return null

  async function seed(count: number) {
    setError(null)
    try {
      for (let i = 0; i < count; i++) {
        const category = CATEGORY_OPTIONS[i % CATEGORY_OPTIONS.length]
        await backend.wardrobe.create({
          name: `${NAMES[i % NAMES.length]} №${String(i + 1).padStart(4, '0')}`,
          brand: FIXTURE_BRAND,
          category,
          layerType: LAYER_FOR[category] ?? 'tee',
          ownershipStatus: i % 5 === 4 ? 'wishlist' : 'owned',
          seasons: [SEASON_OPTIONS[i % SEASON_OPTIONS.length]],
          occasions: [OCCASION_OPTIONS[i % OCCASION_OPTIONS.length]],
          pricePaid: i % 3 === 0 ? 20 + (i % 40) * 5 : null,
          sourceType: 'import',
        })
        if (i % 50 === 49) {
          setProgress(`${i + 1} / ${count}`)
          await new Promise((r) => setTimeout(r))
        }
      }
      setProgress(null)
      await queryClient.invalidateQueries({ queryKey: ['wardrobe'] })
    } catch (e) {
      setProgress(null)
      setError(e instanceof Error ? e.message : 'Seeding failed')
    }
  }

  async function clear() {
    setError(null)
    setProgress('Clearing…')
    try {
      const fixtures = await backend.wardrobe.list({ search: FIXTURE_BRAND })
      let n = 0
      for (const item of fixtures) {
        if (item.brand === FIXTURE_BRAND) {
          await backend.wardrobe.softDelete(item.id)
          if (++n % 100 === 0) await new Promise((r) => setTimeout(r))
        }
      }
      setProgress(null)
      await queryClient.invalidateQueries({ queryKey: ['wardrobe'] })
    } catch (e) {
      setProgress(null)
      setError(e instanceof Error ? e.message : 'Clearing failed')
    }
  }

  return (
    <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
      <Button onClick={() => seed(1000)} disabled={progress !== null}>
        Seed 1,000 test items
      </Button>
      <Button variant="quiet" onClick={clear} disabled={progress !== null}>
        Clear test items
      </Button>
      {progress && <span role="status">{progress}</span>}
      {error && <InlineError>{error}</InlineError>}
    </div>
  )
}
