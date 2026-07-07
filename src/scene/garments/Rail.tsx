import * as THREE from 'three'
import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import type { WardrobeItem } from '../../data/types'
import { useItems } from '../../state/items'
import { useSelection } from '../../state/selection'
import { GarmentCutout } from './GarmentCutout'
import { useBrass, useWalnutWood } from '../materials/woods'

/* rail geometry, matched to the interior brass rail in Wardrobe.tsx */
const RAIL_Y = 1.68
const X_MIN = -0.2
const X_MAX = 0.66
const Z_BASE = -0.04

const HANGABLE = new Set(['tee', 'shirt', 'knit', 'hoodie', 'jacket', 'coat', 'dress', 'skirt', 'pants', 'shorts'])

function Hook({ brass }: { brass: THREE.Material }) {
  return (
    <group>
      <group rotation-x={-0.5}>
        <mesh rotation-y={Math.PI / 2} material={brass} castShadow>
          <torusGeometry args={[0.024, 0.003, 8, 20, Math.PI * 1.4]} />
        </mesh>
      </group>
      <mesh position={[0, -0.04, 0.011]} material={brass}>
        <cylinderGeometry args={[0.0028, 0.0028, 0.05, 8]} />
      </mesh>
    </group>
  )
}

function HangerBar({ wishlist, oak, brass }: { wishlist: boolean; oak: THREE.Material; brass: THREE.Material }) {
  const mat = wishlist ? brass : oak
  const t = wishlist ? 0.008 : 0.013
  return (
    <group position={[0, -0.088, 0.011]}>
      <mesh position={[-0.082, -0.005, 0]} rotation-z={0.32} material={mat} castShadow>
        <boxGeometry args={[0.17, t, t]} />
      </mesh>
      <mesh position={[0.082, -0.005, 0]} rotation-z={-0.32} material={mat} castShadow>
        <boxGeometry args={[0.17, t, t]} />
      </mesh>
      <mesh position={[0, -0.052, 0]} material={mat} castShadow>
        <boxGeometry args={[0.29, t, t * 0.9]} />
      </mesh>
    </group>
  )
}

function SwingTag({ brass, onToggleOwn }: { brass: THREE.Material; onToggleOwn: () => void }) {
  // A small cream paper swing-tag on a brass string — diegetic price label.
  const linenMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#efe7d4', roughness: 0.95 }),
    [],
  )
  return (
    <group position={[0.13, -0.02, 0.03]} rotation-z={-0.14} onClick={(e) => (e.stopPropagation(), onToggleOwn())}>
      <mesh material={brass}>
        <cylinderGeometry args={[0.0015, 0.0015, 0.06, 6]} />
      </mesh>
      <mesh position={[0, -0.05, 0]} material={linenMat} castShadow>
        <boxGeometry args={[0.075, 0.05, 0.004]} />
      </mesh>
      <mesh position={[0, -0.032, 0.0022]}>
        <circleGeometry args={[0.004, 12]} />
        <meshStandardMaterial color="#b08d57" metalness={0.8} roughness={0.4} />
      </mesh>
    </group>
  )
}

function HangingGarment({
  item,
  x,
  z,
  rot,
  oak,
  brass,
}: {
  item: WardrobeItem
  x: number
  z: number
  rot: number
  oak: THREE.Material
  brass: THREE.Material
}) {
  const group = useRef<THREE.Group | null>(null)
  const [hovered, setHovered] = useState(false)
  const focused = useSelection((s) => s.focused === item.id)
  const selectMode = useSelection((s) => s.selectMode)
  const isSelected = useSelection((s) => s.selected.has(item.id))
  const toggleOwned = useItems((s) => s.toggleOwned)
  const phase = useRef(Math.random() * Math.PI * 2)

  useFrame(() => {
    if (!group.current) return
    const t = performance.now() / 1000
    // idle + hover sway around the hook
    const swayAmt = hovered ? 0.05 : 0.012
    const sway = Math.sin(t * 1.3 + phase.current) * swayAmt
    const targetRotZ = rot + sway
    group.current.rotation.z += (targetRotZ - group.current.rotation.z) * 0.1
    // focus slides the garment forward and upright
    const targetZ = focused ? z + 0.22 : z
    group.current.position.z += (targetZ - group.current.position.z) * 0.14
    const targetScale = focused ? 1.08 : hovered ? 1.03 : 1
    const s = group.current.scale.x + (targetScale - group.current.scale.x) * 0.14
    group.current.scale.setScalar(s)
  })

  return (
    <group
      ref={group}
      position={[x, RAIL_Y, z]}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(true)
        if (useSelection.getState() && useItems.getState()) document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        setHovered(false)
        document.body.style.cursor = 'auto'
      }}
      onClick={(e) => {
        e.stopPropagation()
        if (selectMode) useSelection.getState().toggleSelected(item.id)
        else useSelection.getState().setFocused(focused ? null : item.id)
      }}
    >
      <Hook brass={brass} />
      <HangerBar wishlist={!item.owned} oak={oak} brass={brass} />
      <group position={[0, -0.31, 0]}>
        <GarmentCutout item={item} hovered={hovered} focused={focused} />
      </group>
      {!item.owned && <SwingTag brass={brass} onToggleOwn={() => toggleOwned(item.id)} />}
      {/* multi-select brass checkmark */}
      {selectMode && (
        <mesh position={[0.12, -0.05, 0.05]}>
          <circleGeometry args={[0.018, 20]} />
          <meshStandardMaterial color={isSelected ? '#b08d57' : '#3a2f22'} metalness={0.7} roughness={0.4} />
        </mesh>
      )}
    </group>
  )
}

export function Rail() {
  const items = useItems((s) => s.items)
  const filter = useItems((s) => s.filter)
  const oak = useWalnutWood({ rotation: Math.PI / 2, repeat: [0.4, 0.1], color: '#7a6247' })
  const brass = useBrass(true)

  const { owned, wishlist } = useMemo(() => {
    const hangable = items.filter((i) => HANGABLE.has(i.template))
    const byFilter = hangable.filter((i) => (filter === 'all' ? true : filter === 'owned' ? i.owned : !i.owned))
    return {
      owned: byFilter.filter((i) => i.owned),
      wishlist: byFilter.filter((i) => !i.owned),
    }
  }, [items, filter])

  // Lay owned across the left/main span, a brass divider, then wishlist.
  const layout = useMemo(() => {
    const pitchOwned = 0.16
    const gap = 0.14
    const ownedW = Math.max(0, (owned.length - 1) * pitchOwned)
    const wishW = Math.max(0, (wishlist.length - 1) * pitchOwned)
    const totalW = ownedW + (wishlist.length ? gap : 0) + wishW
    let startX = -totalW / 2 + (X_MIN + X_MAX) / 2
    startX = Math.max(X_MIN, Math.min(startX, X_MAX - totalW))
    const placed: { item: WardrobeItem; x: number; z: number; rot: number }[] = []
    owned.forEach((item, i) => {
      placed.push({ item, x: startX + i * pitchOwned, z: Z_BASE + i * 0.006, rot: (i % 2 === 0 ? 1 : -1) * 0.02 })
    })
    const dividerX = owned.length ? startX + ownedW + gap / 2 : null
    const wishStart = startX + ownedW + (wishlist.length ? gap : 0)
    wishlist.forEach((item, i) => {
      placed.push({ item, x: wishStart + i * pitchOwned, z: Z_BASE + (owned.length + i) * 0.006, rot: (i % 2 === 0 ? 1 : -1) * 0.02 })
    })
    return { placed, dividerX }
  }, [owned, wishlist])

  return (
    <group>
      {layout.placed.map(({ item, x, z, rot }) => (
        <HangingGarment key={item.id} item={item} x={x} z={z} rot={rot} oak={oak} brass={brass} />
      ))}
      {/* brass divider between owned and wishlist */}
      {layout.dividerX != null && wishlist.length > 0 && (
        <group position={[layout.dividerX, RAIL_Y, Z_BASE]}>
          <mesh material={brass}>
            <torusGeometry args={[0.02, 0.004, 10, 24]} />
          </mesh>
          <mesh position={[0, -0.14, 0]} material={brass}>
            <cylinderGeometry args={[0.004, 0.004, 0.26, 10]} />
          </mesh>
        </group>
      )}
    </group>
  )
}
