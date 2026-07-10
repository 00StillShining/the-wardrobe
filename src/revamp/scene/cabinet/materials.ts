import { useMemo } from 'react'
import { MeshStandardMaterial } from 'three'

/**
 * Grey-box materials — flat, honest, tinted toward the token hues so
 * compositions read on-direction before real materials land (Phase 2 gate is
 * about framing and light, not finish).
 */
export function useGreyboxMaterials() {
  return useMemo(() => {
    const make = (color: string, roughness = 0.85, metalness = 0) =>
      new MeshStandardMaterial({ color, roughness, metalness })
    return {
      ebonized: make('#2b2a28'),
      ebonizedDeep: make('#1e1d1b'),
      oak: make('#b39a72', 0.9),
      oakDeep: make('#96794f', 0.9),
      linen: make('#d9cfba', 0.95),
      brass: make('#a2823f', 0.35, 0.85),
      mirror: make('#5b6167', 0.1, 0.75),
      interior: make('#35322c', 0.95),
      floor: make('#242320', 0.95),
      wall: make('#1f1e1b', 0.98),
    }
  }, [])
}

export type GreyboxMaterials = ReturnType<typeof useGreyboxMaterials>
