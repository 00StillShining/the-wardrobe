import { useMemo } from 'react'
import type { WardrobeItem, Category } from '../../data/types'
import { useItems } from '../../state/items'
import { useTryOn, LAYER_SLOT } from '../../state/tryOn'
import { useObjectUrl } from '../../hooks/useObjectUrl'
import { useTextureFromUrl } from '../../hooks/useTextureFromUrl'

/**
 * The Mirror (Station 3) — a flat outfit "look". The worn garments are shown
 * as their cutout images, composed head-to-toe inside the mirror frame on the
 * left door: accessory up top, tops/outerwear on the upper body, bottoms below,
 * shoes at the hem, bag to the side. Layered by template slot (coat over knit
 * over denim). No 3D form, no reflection pass — cheap and reads clearly.
 */

const ASPECT = 512 / 680 // the product-photo aspect

// vertical band + width (metres) per category, within the ~0.44×1.5 frame
const BAND: Record<Category, { x?: number; y: number; w: number }> = {
  outerwear: { y: 0.08, w: 0.46 },
  top: { y: 0.16, w: 0.37 },
  dress: { y: -0.04, w: 0.44 },
  bottom: { y: -0.34, w: 0.37 },
  shoes: { y: -0.66, w: 0.32 },
  bag: { x: 0.16, y: -0.12, w: 0.22 },
  accessory: { y: 0.56, w: 0.24 },
}

function OutfitPiece({ item, order }: { item: WardrobeItem; order: number }) {
  const url = useObjectUrl(item.images.cutout)
  const tex = useTextureFromUrl(url)
  const band = BAND[item.category]
  const w = band.w
  const h = w / ASPECT
  const z = 0.02 + order * 0.006 // outer layers proud → no z-fight
  if (!tex) return null
  return (
    <mesh position={[band.x ?? 0, band.y, z]} renderOrder={20 + order} castShadow>
      <planeGeometry args={[w, h]} />
      <meshStandardMaterial
        map={tex}
        transparent
        opacity={item.owned ? 1 : 0.55}
        alphaTest={0.42}
        roughness={1}
        metalness={0}
        envMapIntensity={0.15}
      />
    </mesh>
  )
}

export function MirrorOutfit() {
  const worn = useTryOn((s) => s.worn)
  const items = useItems((s) => s.items)

  const wornItems = useMemo(
    () =>
      worn
        .map((id) => items.find((i) => i.id === id))
        .filter((i): i is WardrobeItem => !!i)
        .sort((a, b) => LAYER_SLOT[a.template] - LAYER_SLOT[b.template]),
    [worn, items],
  )

  return (
    <group>
      {wornItems.map((item, i) => (
        <OutfitPiece key={item.id} item={item} order={i} />
      ))}
    </group>
  )
}
