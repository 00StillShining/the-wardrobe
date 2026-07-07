import * as THREE from 'three'
import { useEffect } from 'react'
import type { StyleSheet } from '../../data/types'
import { useSheets } from '../../state/sheets'
import { useObjectUrl } from '../../hooks/useObjectUrl'
import { useTextureFromUrl } from '../../hooks/useTextureFromUrl'
import { useBrass } from '../materials/woods'

/**
 * The Pinboard (Station 5) — saved style sheets pinned to the board on the
 * right door as small cards, each held by a brass pin. Mirrors how the outfit
 * sits in the left-door mirror. The board sub-group is Y-rotated, so the
 * thumbnail texture is flipped on X to read the right way round.
 */

const W = 0.16
const H = (W / 4) * 3

function SheetPin({ sheet, x, y, rot, brass }: { sheet: StyleSheet; x: number; y: number; rot: number; brass: THREE.Material }) {
  const url = useObjectUrl(sheet.exportPng)
  const tex = useTextureFromUrl(url)

  useEffect(() => {
    if (!tex) return
    tex.wrapS = THREE.RepeatWrapping
    tex.repeat.x = -1
    tex.offset.x = 1
    tex.needsUpdate = true
  }, [tex])

  return (
    <group position={[x, y, 0.012]} rotation={[0, 0, rot]}>
      {/* paper card backing */}
      <mesh castShadow>
        <planeGeometry args={[W + 0.012, H + 0.012]} />
        <meshStandardMaterial color="#f6f0e2" roughness={0.95} />
      </mesh>
      {tex && (
        <mesh position={[0, 0, 0.001]}>
          <planeGeometry args={[W, H]} />
          <meshStandardMaterial map={tex} roughness={0.9} toneMapped={true} />
        </mesh>
      )}
      {/* brass pin */}
      <mesh position={[0, H / 2 - 0.006, 0.006]} material={brass}>
        <sphereGeometry args={[0.006, 12, 10]} />
      </mesh>
    </group>
  )
}

export function Pinboard3D() {
  const sheets = useSheets((s) => s.sheets)
  const brass = useBrass(true)

  const slots = [
    { x: -0.11, y: 0.42, r: -0.05 },
    { x: 0.11, y: 0.4, r: 0.06 },
    { x: -0.11, y: 0.05, r: 0.04 },
    { x: 0.11, y: 0.02, r: -0.05 },
    { x: -0.11, y: -0.32, r: -0.03 },
    { x: 0.11, y: -0.34, r: 0.05 },
  ]

  return (
    <group>
      {sheets.slice(0, 6).map((sheet, i) => (
        <SheetPin key={sheet.id} sheet={sheet} x={slots[i].x} y={slots[i].y} rot={slots[i].r} brass={brass} />
      ))}
    </group>
  )
}
