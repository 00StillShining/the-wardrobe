import * as THREE from 'three'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useNav } from '../state/navigation'

const COUNT = 80

/** Faint dust drifting through the key light. Time-based, cheap. */
export function DustMotes() {
  const ref = useRef<THREE.Points | null>(null)
  const fullMotion = useNav((s) => s.fullMotion)

  const { positions, seeds } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3)
    const seeds = new Float32Array(COUNT * 3)
    for (let i = 0; i < COUNT; i++) {
      // a loose corridor along the key light beam, left of the wardrobe —
      // never between the camera and the doors (reads as dead pixels there)
      positions[i * 3] = THREE.MathUtils.randFloat(-2.1, -0.55)
      positions[i * 3 + 1] = THREE.MathUtils.randFloat(0.4, 2.6)
      positions[i * 3 + 2] = THREE.MathUtils.randFloat(0.5, 2.3)
      seeds[i * 3] = Math.random() * Math.PI * 2
      seeds[i * 3 + 1] = Math.random() * Math.PI * 2
      seeds[i * 3 + 2] = 0.35 + Math.random() * 0.8
    }
    return { positions, seeds }
  }, [])

  useFrame(() => {
    if (!ref.current || !fullMotion) return
    const t = performance.now() / 1000
    const attr = ref.current.geometry.getAttribute('position') as THREE.BufferAttribute
    for (let i = 0; i < COUNT; i++) {
      const p = seeds[i * 3]
      const q = seeds[i * 3 + 1]
      const s = seeds[i * 3 + 2]
      attr.array[i * 3] = positions[i * 3] + Math.sin(t * 0.05 * s + p) * 0.35
      attr.array[i * 3 + 1] = positions[i * 3 + 1] + Math.sin(t * 0.04 * s + q) * 0.22
      attr.array[i * 3 + 2] = positions[i * 3 + 2] + Math.cos(t * 0.045 * s + p) * 0.3
    }
    attr.needsUpdate = true
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions.slice(), 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.01}
        sizeAttenuation
        color="#ffdfae"
        transparent
        opacity={0.26}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}
