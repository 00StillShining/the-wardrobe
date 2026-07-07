import { useWalnutWood } from './materials/woods'

/** The dim warm room the wardrobe lives in. It exists to be barely seen. */
export function Room() {
  const floor = useWalnutWood({
    rotation: Math.PI / 2,
    repeat: [6, 6],
    color: '#5f4c37',
    roughness: 0.55,
    envMapIntensity: 0.6,
  })

  return (
    <group>
      {/* floor */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 1.5]} receiveShadow material={floor}>
        <planeGeometry args={[16, 14]} />
      </mesh>
      {/* back wall — close behind so the cast shadow stays tucked */}
      <mesh position={[0, 2.5, -0.72]} receiveShadow>
        <planeGeometry args={[16, 5]} />
        <meshStandardMaterial color="#332a1f" roughness={0.95} />
      </mesh>
      {/* skirting board */}
      <mesh position={[0, 0.075, -0.705]} receiveShadow>
        <boxGeometry args={[16, 0.15, 0.024]} />
        <meshStandardMaterial color="#1e1710" roughness={0.9} />
      </mesh>
    </group>
  )
}
