import { useMemo } from 'react'
import * as THREE from 'three'
import { MeshReflectorMaterial } from '@react-three/drei'
import { LAN } from './dims'
import { useLanternMaterials } from './materials'
import { useScene } from '../../stores/scene'

/**
 * The reference room: warm-grey wall, pale floor, flat woven rug, a raking
 * daylight parallelogram (art-directed gradient card), leaning brass mirror
 * (Outfit Studio) and a wall-mounted post tray (Add / Import).
 */

function useLightPatch(): THREE.CanvasTexture {
  return useMemo(() => {
    const w = 512
    const h = 256
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, w, h)
    // skewed parallelogram, soft edges
    const grad = ctx.createLinearGradient(0, 0, w, 0)
    grad.addColorStop(0, 'rgba(255, 244, 220, 0)')
    grad.addColorStop(0.25, 'rgba(255, 244, 220, 0.55)')
    grad.addColorStop(0.75, 'rgba(255, 244, 220, 0.55)')
    grad.addColorStop(1, 'rgba(255, 244, 220, 0)')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.moveTo(w * 0.18, h)
    ctx.lineTo(w * 0.42, 0)
    ctx.lineTo(w * 0.86, 0)
    ctx.lineTo(w * 0.62, h)
    ctx.closePath()
    ctx.fill()
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }, [])
}

function LeaningMirror({ frame, fallback }: { frame: THREE.Material; fallback: THREE.Material }) {
  const quality = useScene((s) => s.quality)
  return (
    <group position={[LAN.mirrorX, 0, 0.45]} rotation={[-0.075, 0.18, 0]}>
      <mesh material={frame} position={[0, 0.95, 0]} castShadow>
        <boxGeometry args={[0.62, 1.9, 0.03]} />
      </mesh>
      {quality === 'reduced' ? (
        <mesh material={fallback} position={[0, 0.95, 0.017]}>
          <boxGeometry args={[0.56, 1.84, 0.006]} />
        </mesh>
      ) : (
        <mesh position={[0, 0.95, 0.02]}>
          <planeGeometry args={[0.56, 1.84]} />
          <MeshReflectorMaterial
            mirror={0.9}
            resolution={512}
            blur={[160, 40]}
            mixBlur={0.55}
            mixStrength={1.4}
            depthScale={0.25}
            minDepthThreshold={0.6}
            color="#d2d6da"
            metalness={0.45}
            roughness={0.35}
          />
        </mesh>
      )}
    </group>
  )
}

export function Surroundings() {
  const m = useLanternMaterials()
  const patch = useLightPatch()

  return (
    <group>
      {/* floor + wall */}
      <mesh material={m.floor} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 2.6]} receiveShadow>
        <planeGeometry args={[16, 11]} />
      </mesh>
      <mesh material={m.wall} position={[0, 2.4, -0.02]} receiveShadow>
        <planeGeometry args={[16, 5.6]} />
      </mesh>

      {/* deep ceiling shadow band — the lantern glows against it (refs) */}
      <mesh position={[0, 4.45, 0.008]}>
        <planeGeometry args={[16, 2.4]} />
        <meshBasicMaterial color="#141311" transparent opacity={0.82} depthWrite={false} />
      </mesh>

      {/* raking daylight patch on the wall */}
      <mesh position={[1.3, 2.55, 0.005]}>
        <planeGeometry args={[4.6, 2.3]} />
        <meshBasicMaterial map={patch} transparent opacity={0.28} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* flat woven rug */}
      <mesh material={m.rug} position={[0.1, 0.006, 1.7]} receiveShadow>
        <boxGeometry args={[4.4, 0.012, 2.4]} />
      </mesh>

      {/* leaning mirror — Outfit Studio. A REAL planar reflection (one
          extra render pass); reduced quality keeps the cheap glass. */}
      <LeaningMirror frame={m.brass} fallback={m.mirror} />

      {/* wall-mounted brass post tray with received photos — Add / Import.
          The composition needs a subject: cream cards fanned in the tray,
          one with an oxblood edge, lit warm (reference post-tray). */}
      <group position={[LAN.trayX, LAN.trayY, 0.14]}>
        {/* oak ledge behind, brass tray floor + rim rails */}
        <mesh material={m.oak} position={[0, -0.028, -0.03]}>
          <boxGeometry args={[0.46, 0.024, 0.09]} />
        </mesh>
        <mesh material={m.brass}>
          <boxGeometry args={[0.42, 0.008, 0.3]} />
        </mesh>
        {[
          { p: [0, 0.018, 0.146] as const, s: [0.42, 0.03, 0.008] as const },
          { p: [0, 0.018, -0.146] as const, s: [0.42, 0.03, 0.008] as const },
          { p: [0.206, 0.018, 0] as const, s: [0.008, 0.03, 0.3] as const },
          { p: [-0.206, 0.018, 0] as const, s: [0.008, 0.03, 0.3] as const },
        ].map((f, i) => (
          <mesh key={i} material={m.brass} position={f.p as unknown as [number, number, number]}>
            <boxGeometry args={f.s as unknown as [number, number, number]} />
          </mesh>
        ))}
        {/* fanned cream photo cards resting in the tray */}
        {[
          { x: -0.08, rot: 0.12, c: '#efe7d3' },
          { x: 0.0, rot: -0.05, c: '#f4efe3' },
          { x: 0.09, rot: 0.2, c: '#e8dfc9' },
        ].map((card, i) => (
          <mesh key={i} position={[card.x, 0.012 + i * 0.004, 0.02]} rotation={[-Math.PI / 2, 0, card.rot]}>
            <planeGeometry args={[0.16, 0.2]} />
            <meshStandardMaterial color={card.c} roughness={0.85} side={2} />
          </mesh>
        ))}
        {/* one photo with an oxblood border — the newest arrival */}
        <mesh position={[0.02, 0.026, 0.03]} rotation={[-Math.PI / 2, 0, -0.14]}>
          <planeGeometry args={[0.13, 0.16]} />
          <meshStandardMaterial color="#6f2a24" roughness={0.7} side={2} />
        </mesh>
        <mesh position={[0.02, 0.027, 0.03]} rotation={[-Math.PI / 2, 0, -0.14]}>
          <planeGeometry args={[0.1, 0.13]} />
          <meshStandardMaterial color="#d8ccb4" roughness={0.85} side={2} />
        </mesh>
        {/* warm picture light so the tray never reads as a dark bracket */}
        <pointLight position={[0, 0.3, 0.25]} color="#ffe2b0" intensity={2.2} distance={1.2} />
      </group>
    </group>
  )
}
