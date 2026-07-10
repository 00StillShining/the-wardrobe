import * as THREE from 'three'
import { useMemo } from 'react'
import { useTexture } from '@react-three/drei'

/**
 * Final materials (plan §12.2 step 2), calibrated to the sampled tokens:
 * pale quarter-sawn oak, ebonized timber, aged brass, woven linen. The PBR
 * wood sets are the repo's Poly Haven CC0 assets (see ASSETS.md); grain
 * rotation follows each panel — the v1 lesson carried forward. Colours
 * multiply the maps toward the DESIGN.md tokens, away from the v1 brown.
 */

const OAK_PATHS = {
  map: '/textures/oak/diff.jpg',
  normalMap: '/textures/oak/normal.jpg',
  roughnessMap: '/textures/oak/rough.jpg',
}
const DARK_PATHS = {
  map: '/textures/dark/diff.jpg',
  normalMap: '/textures/dark/normal.jpg',
  roughnessMap: '/textures/dark/rough.jpg',
}

function configure(
  tex: THREE.Texture,
  opts: { rotation: number; repeat: [number, number]; srgb?: boolean },
): THREE.Texture {
  const t = tex.clone()
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.center.set(0.5, 0.5)
  t.rotation = opts.rotation
  t.repeat.set(...opts.repeat)
  if (opts.srgb) t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  t.needsUpdate = true
  return t
}

interface WoodOpts {
  rotation?: number
  repeat?: [number, number]
}

/** Pale quarter-sawn oak (token --oak #c9ab81 band). */
export function usePaleOak({ rotation = 0, repeat = [1, 1] }: WoodOpts = {}): THREE.MeshStandardMaterial {
  const maps = useTexture(OAK_PATHS)
  return useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: configure(maps.map, { rotation, repeat, srgb: true }),
        normalMap: configure(maps.normalMap, { rotation, repeat }),
        roughnessMap: configure(maps.roughnessMap, { rotation, repeat }),
        color: new THREE.Color('#d6bd97'),
        roughness: 0.92,
        envMapIntensity: 0.5,
      }),
    [maps, rotation, repeat[0], repeat[1]], // eslint-disable-line react-hooks/exhaustive-deps
  )
}

/** Ebonized structural timber — near-neutral dark, slight lacquer sheen. */
export function useEbonized({ rotation = 0, repeat = [1, 1] }: WoodOpts = {}): THREE.MeshStandardMaterial {
  const maps = useTexture(DARK_PATHS)
  return useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: configure(maps.map, { rotation, repeat, srgb: true }),
        normalMap: configure(maps.normalMap, { rotation, repeat }),
        roughnessMap: configure(maps.roughnessMap, { rotation, repeat }),
        // cool multiplier neutralizes the map's red cast → ebonized, not mahogany
        color: new THREE.Color('#2e3036'),
        roughness: 0.55,
        envMapIntensity: 0.8,
      }),
    [maps, rotation, repeat[0], repeat[1]], // eslint-disable-line react-hooks/exhaustive-deps
  )
}

/** Aged brass — the app's jewellery; needs the environment to read as metal. */
export function useBrass(): THREE.MeshPhysicalMaterial {
  return useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color('#b08d57'),
        metalness: 1,
        roughness: 0.28,
        clearcoat: 0.35,
        clearcoatRoughness: 0.3,
        envMapIntensity: 1.5,
      }),
    [],
  )
}

/** Procedural woven linen — ivory, visible weave, no asset needed. */
export function useLinenWeave(tintHex = '#e2d8c2'): THREE.MeshStandardMaterial {
  return useMemo(() => {
    const size = 256
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = tintHex
    ctx.fillRect(0, 0, size, size)
    // two thread directions with slight value jitter
    for (let i = 0; i < size; i += 2) {
      const v = 226 + Math.round(((i * 7919) % 13) - 6)
      ctx.fillStyle = `rgba(${v - 40}, ${v - 48}, ${v - 68}, 0.16)`
      ctx.fillRect(0, i, size, 1)
      ctx.fillStyle = `rgba(${v - 30}, ${v - 40}, ${v - 60}, 0.1)`
      ctx.fillRect(i, 0, 1, size)
    }
    const tex = new THREE.CanvasTexture(canvas)
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(3, 3)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 4
    return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, envMapIntensity: 0.35 })
  }, [tintHex])
}

/** Mirror glass — physical gradient sheen; the reflection pass stays cut (v1 verdict). */
export function useMirrorGlass(): THREE.MeshPhysicalMaterial {
  return useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color('#b9bfc4'),
        metalness: 1,
        roughness: 0.05,
        envMapIntensity: 2.2,
      }),
    [],
  )
}

/** Bottle-green wool felt for the drawer lining. */
export function useBottleFelt(): THREE.MeshStandardMaterial {
  return useMemo(
    () => new THREE.MeshStandardMaterial({ color: new THREE.Color('#2e4636'), roughness: 0.98 }),
    [],
  )
}
