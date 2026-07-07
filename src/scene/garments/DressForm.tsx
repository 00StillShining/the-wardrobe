import * as THREE from 'three'
import { useMemo, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import type { WardrobeItem, GarmentTemplate } from '../../data/types'
import { useItems } from '../../state/items'
import { useTryOn, LAYER_SLOT } from '../../state/tryOn'
import { useObjectUrl } from '../../hooks/useObjectUrl'
import { useTextureFromUrl } from '../../hooks/useTextureFromUrl'
import { useBrass, useWalnutWood } from '../materials/woods'

/**
 * The Mirror (Station 3). A procedural tailor's dress form — a lathe-profile
 * torso on a turned-wood tripod stand with a brass neck cap — wears the outfit
 * from the try-on state. Each garment is a low-poly shell fitted to the form,
 * tinted by the item's palette, with its cutout projected on the front panel.
 * Layering follows fixed template slots; wishlist pieces stay translucent.
 *
 * A GLTF swap path is wired via FORM_GLTF: drop a CC0 mannequin URL there and
 * the procedural form is replaced without touching callers (see ASSETS.md).
 */

const FORM_GLTF: string | null = null // e.g. '/models/mannequin.glb'

// form-local: base of stand at y=0, torso from ~0.9 to 1.52
const TORSO: [number, number][] = [
  [0.045, 1.52],
  [0.05, 1.5],
  [0.16, 1.45],
  [0.185, 1.36],
  [0.15, 1.28],
  [0.135, 1.2],
  [0.185, 1.02],
  [0.17, 0.9],
]

const FORM_POS = new THREE.Vector3(-0.5, 0.0, 0.52)

/* ————— procedural form ————— */

function ProceduralForm() {
  const linen = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#cabfa6', roughness: 1, metalness: 0, envMapIntensity: 0.2 }),
    [],
  )
  const wood = useWalnutWood({ rotation: Math.PI / 2, repeat: [0.6, 0.3], color: '#6a5138' })
  const brass = useBrass(true)

  const torsoGeo = useMemo(() => {
    const pts = TORSO.map(([r, y]) => new THREE.Vector2(r, y))
    return new THREE.LatheGeometry(pts, 40)
  }, [])

  const spindleGeo = useMemo(() => {
    // a turned wooden post — decorative bulges along the height
    const p: THREE.Vector2[] = [
      [0.02, 0.12],
      [0.05, 0.16],
      [0.035, 0.24],
      [0.028, 0.42],
      [0.05, 0.5],
      [0.03, 0.6],
      [0.026, 0.82],
      [0.04, 0.88],
    ].map(([r, y]) => new THREE.Vector2(r, y))
    return new THREE.LatheGeometry(p, 24)
  }, [])

  return (
    <group>
      {/* torso */}
      <mesh geometry={torsoGeo} material={linen} castShadow receiveShadow />
      {/* neck cap */}
      <mesh position={[0, 1.51, 0]} scale={[1, 0.5, 1]} material={brass} castShadow>
        <sphereGeometry args={[0.055, 20, 16]} />
      </mesh>
      {/* turned post */}
      <mesh geometry={spindleGeo} material={wood} castShadow />
      {/* three splayed feet */}
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * 0.14, 0.06, Math.sin(a) * 0.14]}
            rotation={[0, -a, -0.5]}
            material={wood}
            castShadow
          >
            <cylinderGeometry args={[0.014, 0.02, 0.3, 10]} />
          </mesh>
        )
      })}
      {/* brass caps on the feet */}
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.cos(a) * 0.19, 0.02, Math.sin(a) * 0.19]} material={brass}>
            <sphereGeometry args={[0.02, 12, 10]} />
          </mesh>
        )
      })}
    </group>
  )
}

/* ————— one worn garment — the cutout, curved onto the form's front ————— */

// front-panel size/placement per template family (the cutout carries the look)
function frontFor(t: GarmentTemplate) {
  if (t === 'pants' || t === 'shorts' || t === 'skirt') return { y: 0.74, h: 0.66, w: 0.3 }
  if (t === 'dress') return { y: 1.04, h: 1.02, w: 0.36 }
  if (t === 'coat') return { y: 1.0, h: 1.08, w: 0.4 }
  if (t === 'jacket') return { y: 1.16, h: 0.66, w: 0.38 }
  return { y: 1.2, h: 0.6, w: 0.36 } // tee/shirt/knit/hoodie
}

function useDrapedPlane(w: number, h: number) {
  return useMemo(() => {
    const geo = new THREE.PlaneGeometry(w, h, 16, 18)
    const pos = geo.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      // wrap the panel around the torso front (bulge toward viewer at centre)
      const bend = Math.cos((x / (w / 2)) * (Math.PI / 2)) * 0.05
      pos.setZ(i, bend)
    }
    geo.computeVertexNormals()
    return geo
  }, [w, h])
}

function WornGarment({ item, layer }: { item: WardrobeItem; layer: number }) {
  const url = useObjectUrl(item.images.cutout)
  const tex = useTextureFromUrl(url)
  const wishlist = !item.owned
  const front = frontFor(item.template)
  const geo = useDrapedPlane(front.w, front.h)
  const z = 0.15 + layer * 0.02 // outer layers sit proud → no z-fight

  if (!tex) return null
  return (
    <mesh geometry={geo} position={[0, front.y, z]} renderOrder={10 + layer} castShadow>
      <meshStandardMaterial
        map={tex}
        transparent
        opacity={wishlist ? 0.55 : 1}
        alphaTest={0.42}
        side={THREE.DoubleSide}
        roughness={1}
        metalness={0}
        envMapIntensity={0.15}
      />
    </mesh>
  )
}

/* ————— the dressed form ————— */

export function DressForm() {
  const worn = useTryOn((s) => s.worn)
  const items = useItems((s) => s.items)
  const spin = useTryOn((s) => s.spin)
  const group = useRef<THREE.Group | null>(null)
  const drag = useRef<{ active: boolean; startX: number; startSpin: number }>({ active: false, startX: 0, startSpin: 0 })

  const wornItems = useMemo(() => {
    return worn
      .map((id) => items.find((i) => i.id === id))
      .filter((i): i is WardrobeItem => !!i)
      .sort((a, b) => LAYER_SLOT[a.template] - LAYER_SLOT[b.template])
  }, [worn, items])

  useFrame(() => {
    if (!group.current) return
    const target = spin
    group.current.rotation.y += (target - group.current.rotation.y) * 0.18
  })

  const onDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    drag.current = { active: true, startX: e.clientX, startSpin: useTryOn.getState().spin }
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
  }
  const onMove = (e: ThreeEvent<PointerEvent>) => {
    if (!drag.current.active) return
    const dx = e.clientX - drag.current.startX
    useTryOn.getState().setSpin(drag.current.startSpin + dx * 0.01)
  }
  const onUp = () => {
    drag.current.active = false
  }

  return (
    <group position={FORM_POS.toArray()}>
      <group
        ref={group}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerOver={() => (document.body.style.cursor = 'grab')}
        onPointerOut={() => (document.body.style.cursor = 'auto')}
      >
        {FORM_GLTF ? null : <ProceduralForm />}
        {wornItems.map((item, i) => (
          <WornGarment key={item.id} item={item} layer={LAYER_SLOT[item.template] ?? i} />
        ))}
      </group>
    </group>
  )
}
