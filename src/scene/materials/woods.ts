import * as THREE from 'three'
import { useMemo } from 'react'
import { useTexture } from '@react-three/drei'

/**
 * Material studies — oak, walnut, brass. Three materials carry the app.
 * Wood grain direction must follow each panel: `useOak(rotation)` clones
 * the texture set with the grain rotated per panel.
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
) {
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.center.set(0.5, 0.5)
  tex.rotation = opts.rotation
  tex.repeat.set(...opts.repeat)
  if (opts.srgb) tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  tex.needsUpdate = true
  return tex
}

export interface WoodOptions {
  /** grain rotation in radians — 0 = vertical grain as authored */
  rotation?: number
  repeat?: [number, number]
  color?: string
  roughness?: number
  envMapIntensity?: number
}

/** Oak with grain rotated per panel. Memoised per-option-set. */
export function useOak({
  rotation = 0,
  repeat = [1, 1],
  color = '#a98a62',
  roughness = 1,
  envMapIntensity = 0.45,
}: WoodOptions = {}): THREE.MeshStandardMaterial {
  const maps = useTexture(OAK_PATHS)
  return useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      map: configure(maps.map.clone(), { rotation, repeat, srgb: true }),
      normalMap: configure(maps.normalMap.clone(), { rotation, repeat }),
      roughnessMap: configure(maps.roughnessMap.clone(), { rotation, repeat }),
      color: new THREE.Color(color),
      roughness,
      metalness: 0,
      envMapIntensity,
    })
    m.normalScale.set(0.65, 0.65)
    return m
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maps, rotation, repeat[0], repeat[1], color, roughness, envMapIntensity])
}

/** Dark walnut-toned wood for the interior carcase and floor. */
export function useWalnutWood({
  rotation = 0,
  repeat = [1, 1],
  color = '#8a7258',
  roughness = 1,
  envMapIntensity = 0.3,
}: WoodOptions = {}): THREE.MeshStandardMaterial {
  const maps = useTexture(DARK_PATHS)
  return useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      map: configure(maps.map.clone(), { rotation, repeat, srgb: true }),
      normalMap: configure(maps.normalMap.clone(), { rotation, repeat }),
      roughnessMap: configure(maps.roughnessMap.clone(), { rotation, repeat }),
      color: new THREE.Color(color),
      roughness,
      metalness: 0,
      envMapIntensity,
    })
    m.normalScale.set(0.55, 0.55)
    return m
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maps, rotation, repeat[0], repeat[1], color, roughness, envMapIntensity])
}

/** Brushed brass. One shared instance is fine — brass is the jewellery. */
export function useBrass(bright = false): THREE.MeshPhysicalMaterial {
  return useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(bright ? '#c9a568' : '#b08d57'),
        metalness: 1,
        roughness: bright ? 0.22 : 0.3,
        envMapIntensity: 1.4,
        clearcoat: 0.15,
        clearcoatRoughness: 0.4,
      }),
    [bright],
  )
}

/** The engraved wordmark plaque texture, drawn once Fraunces is ready. */
export function usePlaqueTexture(text: string): THREE.CanvasTexture {
  return useMemo(() => {
    const w = 1024
    const h = 192
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')!

    const draw = () => {
      // Brass field with a soft vertical sheen
      const grad = ctx.createLinearGradient(0, 0, 0, h)
      grad.addColorStop(0, '#c19a60')
      grad.addColorStop(0.45, '#b08d57')
      grad.addColorStop(1, '#96753f')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, w, h)

      const label = text.split('').join(' ') // thin-space letterspacing
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = `560 ${h * 0.42}px "Fraunces Variable", Georgia, serif`
      // Engraving: light catch on the lower edge, then the sunk dark stroke
      ctx.fillStyle = 'rgba(238, 214, 160, 0.9)'
      ctx.fillText(label, w / 2, h / 2 + h * 0.018)
      ctx.fillStyle = '#57421f'
      ctx.fillText(label, w / 2, h / 2 - h * 0.01)
      tex.needsUpdate = true
    }

    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 8
    draw()
    // Redraw once the real serif arrives
    if (document.fonts?.load) {
      document.fonts.load('560 80px "Fraunces Variable"').then(draw).catch(() => {})
    }
    return tex
  }, [text])
}
