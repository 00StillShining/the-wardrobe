import * as THREE from 'three'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { WardrobeItem } from '../../data/types'
import { useObjectUrl } from '../../hooks/useObjectUrl'
import { useTextureFromUrl } from '../../hooks/useTextureFromUrl'

/**
 * A garment as its background-removed cutout on a gently curved, two-sided
 * plane — a soft cloth bend so it reads as fabric, never a flat sticker.
 * Wishlist ("ghost") garments render slightly translucent.
 */

const PLANE_W = 0.37
const PLANE_H = 0.491 // matches the 512×680 photo aspect

function useClothPlane() {
  return useMemo(() => {
    const geo = new THREE.PlaneGeometry(PLANE_W, PLANE_H, 14, 18)
    const pos = geo.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const y = pos.getY(i)
      // curve the sides back toward the wardrobe, plus a faint vertical drape
      const bend = -Math.cos((x / (PLANE_W / 2)) * (Math.PI / 2)) * 0.028
      const drape = Math.sin((y / PLANE_H) * Math.PI) * 0.006
      pos.setZ(i, bend + drape)
    }
    geo.computeVertexNormals()
    return geo
  }, [])
}

export function GarmentCutout({
  item,
  hovered,
  focused,
}: {
  item: WardrobeItem
  hovered: boolean
  focused: boolean
}) {
  const geo = useClothPlane()
  const url = useObjectUrl(item.images.cutout)
  const tex = useTextureFromUrl(url)
  const matRef = useRef<THREE.MeshStandardMaterial | null>(null)
  const wishlist = !item.owned

  useFrame(() => {
    if (!matRef.current) return
    const target = wishlist ? (focused ? 0.85 : 0.5) : 1
    matRef.current.opacity += (target - matRef.current.opacity) * 0.15
  })

  if (!tex) return null

  return (
    <mesh geometry={geo} castShadow>
      <meshStandardMaterial
        ref={matRef}
        map={tex}
        transparent
        opacity={wishlist ? 0.5 : 1}
        alphaTest={0.42}
        side={THREE.DoubleSide}
        roughness={1}
        metalness={0}
        envMapIntensity={0.15}
        emissive={new THREE.Color('#ffdca8')}
        emissiveIntensity={hovered ? 0.06 : 0}
      />
    </mesh>
  )
}

export const GARMENT_PLANE = { PLANE_W, PLANE_H }
