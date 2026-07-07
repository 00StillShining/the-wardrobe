import * as THREE from 'three'
import { forwardRef, useMemo } from 'react'

type SpotProps = {
  target: [number, number, number]
} & Omit<JSX.IntrinsicElements['spotLight'], 'target'>

/**
 * A spotlight whose target actually lives in the scene graph —
 * a bare `target-position` on <spotLight> silently aims at the origin.
 */
export const Spot = forwardRef<THREE.SpotLight, SpotProps>(function Spot({ target, ...rest }, ref) {
  const targetObj = useMemo(() => new THREE.Object3D(), [])
  return (
    <>
      <spotLight ref={ref} target={targetObj} {...rest} />
      <primitive object={targetObj} position={target} />
    </>
  )
})
