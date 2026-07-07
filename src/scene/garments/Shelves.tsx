import * as THREE from 'three'
import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import type { WardrobeItem } from '../../data/types'
import { useItems } from '../../state/items'
import { useSelection } from '../../state/selection'
import { useObjectUrl } from '../../hooks/useObjectUrl'
import { useTextureFromUrl } from '../../hooks/useTextureFromUrl'

/**
 * The Shelves (Station 2) — folded stacks and standing props on the shelf
 * column, browsable by category. Soft items fold into tinted cloth blocks;
 * props (bag, shoes, glasses, jewellery) stand as small cutout cards.
 */

const SHELF_X = -0.5
const SHELVES_Y = [1.52, 1.16, 0.8]

/* —— a folded cloth block, tinted by the garment's dominant colour —— */
function FoldedBlock({ item, y, x }: { item: WardrobeItem; y: number; x: number }) {
  const color = item.palette[0] ?? '#8a7a68'
  const geo = useMemo(() => new THREE.BoxGeometry(0.22, 0.045, 0.15), [])
  const layers = 3
  return (
    <group position={[x, y, -0.02]}>
      {Array.from({ length: layers }).map((_, i) => (
        <mesh key={i} geometry={geo} position={[i * 0.004, 0.024 + i * 0.046, -i * 0.004]} castShadow receiveShadow>
          <meshStandardMaterial color={color} roughness={0.85} />
        </mesh>
      ))}
      {/* soft fold shadow line */}
      <mesh position={[0, 0.024 + (layers - 1) * 0.046 + 0.023, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[0.2, 0.13]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
    </group>
  )
}

/* —— a standing cutout card for props —— */
function PropCard({ item, y, x }: { item: WardrobeItem; y: number; x: number }) {
  const url = useObjectUrl(item.images.cutout)
  const tex = useTextureFromUrl(url)
  const group = useRef<THREE.Group | null>(null)
  const [hovered, setHovered] = useState(false)
  const selectMode = useSelection((s) => s.selectMode)
  const isSelected = useSelection((s) => s.selected.has(item.id))

  useFrame(() => {
    if (!group.current) return
    const target = hovered ? 1.06 : 1
    const s = group.current.scale.x + (target - group.current.scale.x) * 0.15
    group.current.scale.setScalar(s)
  })

  if (!tex) return null
  return (
    <group
      ref={group}
      position={[x, y + 0.12, -0.02]}
      rotation-x={-0.12}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(true)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        setHovered(false)
        document.body.style.cursor = 'auto'
      }}
      onClick={(e) => {
        e.stopPropagation()
        if (selectMode) useSelection.getState().toggleSelected(item.id)
        else useSelection.getState().setFocused(item.id)
      }}
    >
      <mesh castShadow>
        <planeGeometry args={[0.2, 0.26]} />
        <meshStandardMaterial
          map={tex}
          transparent
          opacity={item.owned ? 1 : 0.55}
          alphaTest={0.42}
          side={THREE.DoubleSide}
          roughness={1}
          metalness={0}
          envMapIntensity={0.15}
          emissive={new THREE.Color('#ffdca8')}
          emissiveIntensity={hovered ? 0.07 : 0}
        />
      </mesh>
      {selectMode && (
        <mesh position={[0.08, 0.1, 0.01]}>
          <circleGeometry args={[0.016, 20]} />
          <meshStandardMaterial color={isSelected ? '#b08d57' : '#3a2f22'} metalness={0.7} roughness={0.4} />
        </mesh>
      )}
    </group>
  )
}

export function Shelves() {
  const items = useItems((s) => s.items)
  const filter = useItems((s) => s.filter)

  const { props, folded } = useMemo(() => {
    const byFilter = items.filter((i) => (filter === 'all' ? true : filter === 'owned' ? i.owned : !i.owned))
    return {
      props: byFilter.filter((i) => i.template === 'prop'),
      // knits also fold nicely onto the shelves (they hang on the rail too)
      folded: byFilter.filter((i) => i.template === 'knit'),
    }
  }, [items, filter])

  // distribute: props stand two-per-shelf; folded knits fill the remaining spots
  const placements = useMemo(() => {
    const out: { item: WardrobeItem; y: number; x: number; kind: 'prop' | 'fold' }[] = []
    const slots = [
      { y: SHELVES_Y[0], x: SHELF_X - 0.1 },
      { y: SHELVES_Y[0], x: SHELF_X + 0.1 },
      { y: SHELVES_Y[1], x: SHELF_X - 0.1 },
      { y: SHELVES_Y[1], x: SHELF_X + 0.1 },
      { y: SHELVES_Y[2], x: SHELF_X - 0.1 },
      { y: SHELVES_Y[2], x: SHELF_X + 0.1 },
    ]
    let s = 0
    for (const p of props) {
      if (s >= slots.length) break
      out.push({ item: p, ...slots[s++], kind: 'prop' })
    }
    for (const f of folded) {
      if (s >= slots.length) break
      out.push({ item: f, ...slots[s++], kind: 'fold' })
    }
    return out
  }, [props, folded])

  return (
    <group>
      {placements.map((p) =>
        p.kind === 'prop' ? (
          <PropCard key={p.item.id} item={p.item} y={p.y} x={p.x} />
        ) : (
          <FoldedBlock key={p.item.id} item={p.item} y={p.y} x={p.x} />
        ),
      )}
    </group>
  )
}
