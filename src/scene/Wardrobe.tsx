import * as THREE from 'three'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox, MeshReflectorMaterial, useTexture } from '@react-three/drei'
import { Spot } from './Spot'
import { useOak, useWalnutWood, useBrass, usePlaqueTexture } from './materials/woods'
import { useNav } from '../state/navigation'
import type { StationId } from './stations'
import { settle, clamp01, easeCamera } from './easing'
import { Rail } from './garments/Rail'
import { Shelves } from './garments/Shelves'

/* ————— dimensions (metres) —————
   The whole cabinet is parameterised from these so panels stay honest. */
const W = 1.54 // overall carcase width
const SIDE = 0.05 // side panel thickness
const INNER = W / 2 - SIDE // 0.72 — inner half-width
const D = 0.6 // carcase depth: z -0.27 … +0.33
const ZF = 0.33 // front face
const ZB = -0.27 // back face
const DOOR_W = INNER - 0.004
const DOOR_H = 1.96 // doors span y 0.20 … 2.16
const DOOR_T = 0.034
const DOOR_Y = 0.2 + DOOR_H / 2
const OPEN_ANGLE = THREE.MathUtils.degToRad(107)

/* ————— small parts ————— */

function BunFoot({ position, material }: { position: [number, number, number]; material: THREE.Material }) {
  const geo = useMemo(() => {
    const pts = [
      new THREE.Vector2(0.004, 0),
      new THREE.Vector2(0.05, 0.004),
      new THREE.Vector2(0.058, 0.02),
      new THREE.Vector2(0.052, 0.042),
      new THREE.Vector2(0.036, 0.06),
      new THREE.Vector2(0.028, 0.072),
    ]
    return new THREE.LatheGeometry(pts, 20)
  }, [])
  return <mesh geometry={geo} material={material} position={position} castShadow receiveShadow />
}

function Escutcheon({ brass }: { brass: THREE.Material }) {
  // Small brass plate with a sunk keyhole
  return (
    <group>
      <RoundedBox args={[0.04, 0.066, 0.006]} radius={0.006} smoothness={4} material={brass} castShadow />
      <mesh position={[0, 0.008, 0.0033]}>
        <circleGeometry args={[0.0055, 20]} />
        <meshStandardMaterial color="#140e07" roughness={0.7} />
      </mesh>
      <mesh position={[0, -0.007, 0.0033]}>
        <planeGeometry args={[0.007, 0.018]} />
        <meshStandardMaterial color="#140e07" roughness={0.7} />
      </mesh>
    </group>
  )
}

function Key({ brass, keyRef }: { brass: THREE.Material; keyRef: React.MutableRefObject<THREE.Group | null> }) {
  return (
    <group ref={keyRef} rotation={[0, 0, 0.3]}>
      {/* collar at the keyhole */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.006]} material={brass} castShadow>
        <cylinderGeometry args={[0.0062, 0.0062, 0.012, 16]} />
      </mesh>
      {/* shank */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.032]} material={brass} castShadow>
        <cylinderGeometry args={[0.0042, 0.0042, 0.052, 12]} />
      </mesh>
      {/* bow — slightly ovalled ring */}
      <mesh position={[0, -0.028, 0.058]} scale={[1, 1.3, 1]} material={brass} castShadow>
        <torusGeometry args={[0.021, 0.005, 10, 28]} />
      </mesh>
    </group>
  )
}

/* ————— hotspot plaque — the diegetic navigation ————— */

function Hotspot({
  station,
  text,
  position,
  rotation = [0, 0, 0],
  backing,
}: {
  station: StationId
  text: string
  position: [number, number, number]
  rotation?: [number, number, number]
  backing: THREE.Material
}) {
  const tex = usePlaqueTexture(text)
  const hover = useRef(false)
  const faceMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: tex,
        metalness: 0.85,
        roughness: 0.42,
        emissive: new THREE.Color('#ffd9a0'),
        emissiveIntensity: 0,
        envMapIntensity: 1.1,
      }),
    [tex],
  )

  useFrame(() => {
    const nav = useNav.getState()
    const t = performance.now() / 1000
    // hover glow, plus a single glint when this station is the destination
    let target = hover.current ? 0.45 : 0
    if (nav.station === station) {
      const dt = t - nav.tStation
      if (dt < 0.7) target = Math.max(target, Math.sin(clamp01(dt / 0.7) * Math.PI) * 0.9)
    }
    faceMat.emissiveIntensity += (target - faceMat.emissiveIntensity) * 0.14
  })

  return (
    <group
      position={position}
      rotation={rotation}
      onClick={(e) => {
        e.stopPropagation()
        useNav.getState().navigate(station)
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        hover.current = true
        if (useNav.getState().doorPhase === 'open') document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        hover.current = false
        document.body.style.cursor = 'auto'
      }}
    >
      <RoundedBox args={[0.15, 0.034, 0.008]} radius={0.004} smoothness={4} material={backing} castShadow />
      <mesh position={[0, 0, 0.0045]} material={faceMat}>
        <planeGeometry args={[0.138, 0.026]} />
      </mesh>
    </group>
  )
}

/* ————— door ————— */

interface DoorProps {
  side: 'left' | 'right'
  doorRef: React.MutableRefObject<THREE.Group | null>
  keyRef?: React.MutableRefObject<THREE.Group | null>
  materials: {
    stile: THREE.Material
    rail: THREE.Material
    panel: THREE.Material
    field: THREE.Material
    brass: THREE.Material
    brassBright: THREE.Material
    linen: THREE.Material
  }
}

function Door({ side, doorRef, keyRef, materials }: DoorProps) {
  const s = side === 'left' ? 1 : -1
  const hingeX = side === 'left' ? -INNER : INNER
  const cx = s * (DOOR_W / 2) // door centreline in local x

  const stileW = 0.09
  const railSpan = DOOR_W - 2 * stileW
  const panelW = railSpan + 0.02
  const panelH = DOOR_H - 0.115 - 0.16 + 0.02

  return (
    <group ref={doorRef} position={[hingeX, DOOR_Y, ZF - DOOR_T / 2]}>
      {/* stiles — vertical grain */}
      <RoundedBox
        args={[stileW, DOOR_H, DOOR_T]}
        radius={0.005}
        smoothness={4}
        position={[s * (stileW / 2), 0, 0]}
        material={materials.stile}
        castShadow
        receiveShadow
      />
      <RoundedBox
        args={[stileW, DOOR_H, DOOR_T]}
        radius={0.005}
        smoothness={4}
        position={[s * (DOOR_W - stileW / 2), 0, 0]}
        material={materials.stile}
        castShadow
        receiveShadow
      />
      {/* rails — horizontal grain */}
      <RoundedBox
        args={[railSpan, 0.115, DOOR_T]}
        radius={0.005}
        smoothness={4}
        position={[cx, DOOR_H / 2 - 0.0575, 0]}
        material={materials.rail}
        castShadow
        receiveShadow
      />
      <RoundedBox
        args={[railSpan, 0.16, DOOR_T]}
        radius={0.005}
        smoothness={4}
        position={[cx, -DOOR_H / 2 + 0.08, 0]}
        material={materials.rail}
        castShadow
        receiveShadow
      />
      {/* recessed panel */}
      <RoundedBox
        args={[panelW, panelH, 0.014]}
        radius={0.004}
        smoothness={4}
        position={[cx, (0.16 - 0.115) / 2, -0.004]}
        material={materials.panel}
        receiveShadow
      />
      {/* raised field — catches the raking key light */}
      <RoundedBox
        args={[panelW - 0.13, panelH - 0.22, 0.016]}
        radius={0.006}
        smoothness={4}
        position={[cx, (0.16 - 0.115) / 2, 0.002]}
        material={materials.field}
        castShadow
        receiveShadow
      />

      {/* astragal on the right door's meeting edge */}
      {side === 'right' && (
        <RoundedBox
          args={[0.024, DOOR_H, 0.012]}
          radius={0.004}
          smoothness={4}
          position={[-DOOR_W - 0.0, 0, DOOR_T / 2 - 0.002]}
          material={materials.stile}
          castShadow
        />
      )}

      {/* hinges on the outer edge */}
      {[-0.82, 0, 0.82].map((y) => (
        <mesh key={y} position={[s * 0.006, y, DOOR_T / 2 - 0.006]} material={materials.brass} castShadow>
          <cylinderGeometry args={[0.007, 0.007, 0.075, 12]} />
        </mesh>
      ))}

      {/* lock furniture near the meeting stile */}
      <group position={[s * (DOOR_W - stileW / 2 + 0.006), -0.14, DOOR_T / 2 + 0.002]}>
        <Escutcheon brass={materials.brassBright} />
        {keyRef && <Key brass={materials.brassBright} keyRef={keyRef} />}
      </group>

      {/* inside of the left door: the beveled mirror (Station 3 lives here) */}
      {side === 'left' && (
        <group position={[cx, 0.02, -DOOR_T / 2 - 0.006]} rotation={[0, Math.PI, 0]}>
          <RoundedBox args={[0.56, 1.66, 0.012]} radius={0.004} smoothness={4} material={materials.stile} />
          {/* brass surround */}
          {(
            [
              [0, 0.815, 0.5, 0.022],
              [0, -0.815, 0.5, 0.022],
              [-0.255, 0, 0.022, 1.6],
              [0.255, 0, 0.022, 1.6],
            ] as const
          ).map(([mx, my, mw, mh], i) => (
            <mesh key={i} position={[mx, my, 0.009]} material={materials.brass}>
              <boxGeometry args={[mw, mh, 0.008]} />
            </mesh>
          ))}
          <Hotspot station="mirror" text="THE MIRROR" position={[0, 0.885, 0.016]} backing={materials.brass} />
          <mesh position={[0, 0, 0.008]}>
            <planeGeometry args={[0.48, 1.58]} />
            <MeshReflectorMaterial
              blur={[280, 60]}
              resolution={1024}
              mixBlur={0.9}
              mixStrength={1.1}
              mirror={0.85}
              depthScale={0.4}
              minDepthThreshold={0.4}
              maxDepthThreshold={1.2}
              color="#b9bcb6"
              metalness={0.5}
              roughness={0.35}
            />
          </mesh>
        </group>
      )}

      {/* inside of the right door: the pinboard (Station 5 lives here) */}
      {side === 'right' && (
        <group position={[cx, 0.02, -DOOR_T / 2 - 0.006]} rotation={[0, Math.PI, 0]}>
          <RoundedBox args={[0.56, 1.66, 0.012]} radius={0.004} smoothness={4} material={materials.stile} />
          <Hotspot station="pinboard" text="THE PINBOARD" position={[0, 0.885, 0.016]} backing={materials.brass} />
          <mesh position={[0, 0, 0.008]}>
            <planeGeometry args={[0.5, 1.6]} />
            <primitive object={materials.linen} attach="material" />
          </mesh>
          {(
            [
              [0, 0.815, 0.56, 0.022],
              [0, -0.815, 0.56, 0.022],
              [-0.27, 0, 0.022, 1.66],
              [0.27, 0, 0.022, 1.66],
            ] as const
          ).map(([mx, my, mw, mh], i) => (
            <mesh key={i} position={[mx, my, 0.009]} material={materials.brass}>
              <boxGeometry args={[mw, mh, 0.008]} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  )
}

/* ————— choreography driver ————— */

function Choreography({
  doorL,
  doorR,
  keyRef,
  picL,
  picR,
  cavityFill,
  drawer,
}: {
  doorL: React.MutableRefObject<THREE.Group | null>
  doorR: React.MutableRefObject<THREE.Group | null>
  keyRef: React.MutableRefObject<THREE.Group | null>
  picL: React.MutableRefObject<THREE.SpotLight | null>
  picR: React.MutableRefObject<THREE.SpotLight | null>
  cavityFill: React.MutableRefObject<THREE.PointLight | null>
  drawer: React.MutableRefObject<THREE.Group | null>
}) {
  const flightFired = useRef(false)
  const prevStation = useRef<StationId>(useNav.getState().station)
  const tDrawer = useRef(-10)

  useFrame(() => {
    const nav = useNav.getState()
    const t = performance.now() / 1000

    // Ledger drawer: opens as the camera cranes down, closes behind you.
    if (nav.station !== prevStation.current) {
      if (nav.station === 'ledger' || prevStation.current === 'ledger') tDrawer.current = t
      prevStation.current = nav.station
    }
    if (drawer.current) {
      const k = clamp01((t - tDrawer.current) / 0.9)
      const ext = nav.station === 'ledger' ? settle(k, 0.045) : 1 - easeCamera(k)
      drawer.current.position.z = 0.25 + ext * 0.34
    }

    // Key turn
    if (keyRef.current) {
      let kk = 0
      if (nav.doorPhase === 'unlocking') kk = clamp01((t - nav.tUnlock) / 0.45)
      else if (nav.doorPhase !== 'closed') kk = 1
      keyRef.current.rotation.z = 0.3 - settle(kk, 0.08) * 1.55
    }

    // Unlock → open handoff
    if (nav.doorPhase === 'unlocking' && t - nav.tUnlock >= 0.52) {
      nav._setDoorPhase('opening')
      flightFired.current = false
    }

    // Door swing — right door (with the key) leads, left follows 90ms later
    let kR = 0
    let kL = 0
    if (nav.doorPhase === 'opening') {
      kR = clamp01((t - nav.tOpen) / 1.25)
      kL = clamp01((t - nav.tOpen - 0.09) / 1.25)
      // camera departs 250ms after the scene starts reacting
      if (!flightFired.current && t - nav.tOpen >= 0.25) {
        flightFired.current = true
        nav._arrive()
      }
      if (t - nav.tOpen >= 1.4) nav._setDoorPhase('open')
    } else if (nav.doorPhase === 'open') {
      kR = 1
      kL = 1
    }
    if (doorR.current) doorR.current.rotation.y = settle(kR, 0.03) * OPEN_ANGLE
    if (doorL.current) doorL.current.rotation.y = -settle(kL, 0.03) * OPEN_ANGLE

    // The picture lights warm up as the doors swing
    const glow = clamp01(kR)
    if (picL.current) picL.current.intensity = glow * 2.4
    if (picR.current) picR.current.intensity = glow * 2.4
    if (cavityFill.current) cavityFill.current.intensity = glow * 0.7
  })

  return null
}

/* ————— the wardrobe ————— */

export function Wardrobe() {
  const doorL = useRef<THREE.Group | null>(null)
  const doorR = useRef<THREE.Group | null>(null)
  const keyRef = useRef<THREE.Group | null>(null)
  const picL = useRef<THREE.SpotLight | null>(null)
  const picR = useRef<THREE.SpotLight | null>(null)
  const cavityFill = useRef<THREE.PointLight | null>(null)
  const drawer = useRef<THREE.Group | null>(null)

  // Material studies — grain follows each panel
  const oakSide = useOak({ rotation: 0, repeat: [1.2, 2.2], color: '#a3835c' })
  const oakStile = useOak({ rotation: 0, repeat: [0.35, 1.9], color: '#a98a62' })
  const oakRail = useOak({ rotation: Math.PI / 2, repeat: [1.4, 0.35], color: '#a3845d' })
  const oakPanel = useOak({ rotation: 0, repeat: [0.8, 1.7], color: '#8f7350', roughness: 1.05 })
  const oakField = useOak({ rotation: 0, repeat: [0.6, 1.5], color: '#b0916a' })
  const oakCornice = useOak({ rotation: Math.PI / 2, repeat: [2.4, 0.25], color: '#997a54' })
  const oakShelf = useOak({ rotation: Math.PI / 2, repeat: [1.1, 0.3], color: '#a98a62' })
  const walnutBack = useWalnutWood({ rotation: Math.PI / 2, repeat: [2.2, 2.6], color: '#6d5940' })
  const walnutPlinth = useWalnutWood({ rotation: Math.PI / 2, repeat: [2.2, 0.3], color: '#5d4a33' })
  const brass = useBrass()
  const brassBright = useBrass(true)
  const plaqueTex = usePlaqueTexture('THE WARDROBE')

  // bottle-green felt + linen board — wood roughness map doubles as fibre bump
  const feltMaps = useTexture({ bumpMap: '/textures/dark/rough.jpg' })
  const felt = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#2e3b33'),
      roughness: 1,
      bumpMap: feltMaps.bumpMap,
      bumpScale: 0.6,
    })
    m.bumpMap!.wrapS = m.bumpMap!.wrapT = THREE.RepeatWrapping
    m.bumpMap!.repeat.set(3, 1.2)
    return m
  }, [feltMaps])
  const linen = useMemo(() => {
    const bump = feltMaps.bumpMap.clone()
    bump.wrapS = bump.wrapT = THREE.RepeatWrapping
    bump.repeat.set(5, 14)
    bump.needsUpdate = true
    const m = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#d5c9ae'),
      roughness: 0.98,
      bumpMap: bump,
      bumpScale: 0.25,
    })
    return m
  }, [feltMaps])

  const doorMats = useMemo(
    () => ({
      stile: oakStile,
      rail: oakRail,
      panel: oakPanel,
      field: oakField,
      brass,
      brassBright,
      linen,
    }),
    [oakStile, oakRail, oakPanel, oakField, brass, brassBright, linen],
  )

  const enter = useNav((s) => s.enter)

  return (
    <group
      onClick={(e) => {
        e.stopPropagation()
        enter()
      }}
      onPointerOver={() => {
        if (useNav.getState().doorPhase === 'closed') document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto'
      }}
    >
      {/* feet */}
      {(
        [
          [-0.66, 0, 0.26],
          [0.66, 0, 0.26],
          [-0.66, 0, -0.2],
          [0.66, 0, -0.2],
        ] as [number, number, number][]
      ).map((p, i) => (
        <BunFoot key={i} position={p} material={walnutPlinth} />
      ))}

      {/* plinth */}
      <RoundedBox
        args={[W + 0.05, 0.13, D + 0.05]}
        radius={0.008}
        smoothness={4}
        position={[0, 0.12, 0.03]}
        material={walnutPlinth}
        castShadow
        receiveShadow
      />

      {/* carcase sides */}
      <RoundedBox
        args={[SIDE, 2.0, D]}
        radius={0.007}
        smoothness={4}
        position={[-(W / 2 - SIDE / 2), 1.18, 0.03]}
        material={oakSide}
        castShadow
        receiveShadow
      />
      <RoundedBox
        args={[SIDE, 2.0, D]}
        radius={0.007}
        smoothness={4}
        position={[W / 2 - SIDE / 2, 1.18, 0.03]}
        material={oakSide}
        castShadow
        receiveShadow
      />

      {/* door stop strips — real cabinetry detail; also stop the camera
          peering into the cavity through the door-edge gaps */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (INNER - 0.02), 1.18, ZF - DOOR_T - 0.012]} material={oakSide} castShadow receiveShadow>
          <boxGeometry args={[0.04, 2.0, 0.024]} />
        </mesh>
      ))}
      <mesh position={[0, 2.14, ZF - DOOR_T - 0.012]} material={oakRail} castShadow receiveShadow>
        <boxGeometry args={[INNER * 2, 0.05, 0.024]} />
      </mesh>

      {/* bottom board + frieze + cornice */}
      <RoundedBox
        args={[W, 0.045, D]}
        radius={0.006}
        smoothness={4}
        position={[0, 0.2, 0.03]}
        material={oakRail}
        receiveShadow
      />
      <RoundedBox
        args={[W, 0.1, D]}
        radius={0.006}
        smoothness={4}
        position={[0, 2.23, 0.03]}
        material={oakCornice}
        castShadow
        receiveShadow
      />
      <RoundedBox
        args={[W + 0.035, 0.036, D + 0.035]}
        radius={0.006}
        smoothness={4}
        position={[0, 2.296, 0.03]}
        material={oakCornice}
        castShadow
      />
      <RoundedBox
        args={[W + 0.075, 0.032, D + 0.06]}
        radius={0.007}
        smoothness={4}
        position={[0, 2.328, 0.03]}
        material={oakCornice}
        castShadow
      />
      <RoundedBox
        args={[W + 0.11, 0.03, D + 0.085]}
        radius={0.008}
        smoothness={4}
        position={[0, 2.357, 0.03]}
        material={oakCornice}
        castShadow
      />

      {/* wordmark plaque on the frieze — clicking it pulls back to the overview */}
      <group
        position={[0, 2.23, ZF + 0.008]}
        onClick={(e) => {
          if (useNav.getState().doorPhase !== 'open') return
          e.stopPropagation()
          useNav.getState().navigate('doors')
        }}
        onPointerOver={() => {
          if (useNav.getState().doorPhase === 'open') document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto'
        }}
      >
        <RoundedBox args={[0.46, 0.08, 0.012]} radius={0.005} smoothness={4} material={brass} castShadow />
        <mesh position={[0, 0, 0.0065]}>
          <planeGeometry args={[0.44, 0.064]} />
          <meshStandardMaterial map={plaqueTex} roughness={0.42} metalness={0.85} envMapIntensity={1.1} />
        </mesh>
        {[-0.215, 0.215].map((x) => (
          <mesh key={x} position={[x, 0, 0.007]} material={brassBright}>
            <sphereGeometry args={[0.0045, 10, 10]} />
          </mesh>
        ))}
      </group>

      {/* ————— interior ————— */}
      <group>
        {/* back panel */}
        <mesh position={[0, 1.19, ZB + 0.012]} castShadow receiveShadow material={walnutBack}>
          <boxGeometry args={[W - 0.06, 1.98, 0.024]} />
        </mesh>
        {/* interior floor above the drawer cavity */}
        <RoundedBox
          args={[INNER * 2, 0.026, D - 0.09]}
          radius={0.004}
          smoothness={4}
          position={[0, 0.455, 0.005]}
          material={oakShelf}
          castShadow
          receiveShadow
        />
        {/* top interior shelf (the post tray will live here) */}
        <RoundedBox
          args={[INNER * 2, 0.026, D - 0.13]}
          radius={0.004}
          smoothness={4}
          position={[0, 1.9, -0.01]}
          material={oakShelf}
          castShadow
          receiveShadow
        />
        {/* shelf column divider */}
        <RoundedBox
          args={[0.024, 1.45, D - 0.13]}
          radius={0.004}
          smoothness={4}
          position={[-0.28, 1.17, -0.01]}
          material={oakShelf}
          castShadow
          receiveShadow
        />
        {/* shelves */}
        {[0.8, 1.16, 1.52].map((y) => (
          <RoundedBox
            key={y}
            args={[INNER - 0.28 - 0.012, 0.022, D - 0.15]}
            radius={0.004}
            smoothness={4}
            position={[-(0.28 + INNER) / 2 + 0.0, y, -0.015]}
            material={oakShelf}
            castShadow
            receiveShadow
          />
        ))}

        {/* brass rail + brackets */}
        <mesh position={[(0.72 - 0.26) / 2, 1.68, 0.0]} rotation-z={Math.PI / 2} material={brass} castShadow>
          <cylinderGeometry args={[0.01, 0.01, 0.72 + 0.26 - 0.03, 16]} />
        </mesh>
        <mesh position={[-0.255, 1.68, 0]} rotation-z={Math.PI / 2} material={brass}>
          <cylinderGeometry args={[0.02, 0.02, 0.014, 16]} />
        </mesh>
        <mesh position={[0.705, 1.68, 0]} rotation-z={Math.PI / 2} material={brass}>
          <cylinderGeometry args={[0.02, 0.02, 0.014, 16]} />
        </mesh>

        {/* the rail garments (Station 1) — cutouts on hangers */}
        <Rail />
        {/* the folded shelves (Station 2) — props + folded stacks */}
        <Shelves />

        {/* ledger drawer (Station 4) — slides open on a Crane-Down */}
        <group ref={drawer} position={[0, 0.325, 0.25]}>
          <RoundedBox args={[INNER * 2 - 0.01, 0.22, 0.03]} radius={0.005} smoothness={4} material={oakRail} castShadow receiveShadow />
          {[-0.35, 0.35].map((x) => (
            <mesh key={x} position={[x, -0.01, 0.022]} rotation-x={Math.PI / 2} material={brass} castShadow>
              <torusGeometry args={[0.028, 0.005, 8, 20, Math.PI]} />
            </mesh>
          ))}
          <Hotspot station="ledger" text="THE LEDGER" position={[0, 0.075, 0.02]} backing={brass} />
          {/* drawer box, felt-lined */}
          <mesh position={[0, -0.02, -0.21]} material={walnutPlinth} castShadow>
            <boxGeometry args={[INNER * 2 - 0.06, 0.16, 0.39]} />
          </mesh>
          <mesh position={[0, 0.065, -0.21]}>
            <boxGeometry args={[INNER * 2 - 0.09, 0.012, 0.36]} />
            <primitive object={felt} attach="material" />
          </mesh>
        </group>

        {/* the post tray waits on the top shelf (flow arrives in Phase 2) */}
        <group position={[0.26, 1.916, 0.0]}>
          <mesh position={[0, 0.008, 0]} material={brass}>
            <boxGeometry args={[0.34, 0.006, 0.23]} />
          </mesh>
          {(
            [
              [0, 0.024, 0.112, 0.34, 0.03, 0.006],
              [0, 0.024, -0.112, 0.34, 0.03, 0.006],
              [-0.167, 0.024, 0, 0.006, 0.03, 0.23],
              [0.167, 0.024, 0, 0.006, 0.03, 0.23],
            ] as const
          ).map(([x, y, z, w, h, d], i) => (
            <mesh key={i} position={[x, y, z]} material={brass}>
              <boxGeometry args={[w, h, d]} />
            </mesh>
          ))}
          {[0, 1, 2].map((i) => (
            <mesh key={i} position={[-0.03 + i * 0.03, 0.034 + i * 0.009, 0.01 - i * 0.012]} rotation={[0, -0.14 + i * 0.12, 0]} castShadow>
              <boxGeometry args={[0.21, 0.005, 0.14]} />
              <meshStandardMaterial color="#f2ead9" roughness={0.9} />
            </mesh>
          ))}
        </group>

        {/* station plaques — diegetic navigation */}
        <Hotspot station="rail" text="THE RAIL" position={[0.16, 0.468, 0.262]} backing={brass} />
        <Hotspot station="shelves" text="THE SHELVES" position={[-0.5, 1.503, 0.196]} backing={brass} />
        <Hotspot station="post" text="THE POST" position={[0.44, 1.9, 0.23]} backing={brass} />

        {/* picture lights washing the rail — shade + mounting stems */}
        <group position={[0, 2.02, 0.24]}>
          {[-0.34, 0.34].map((x) => (
            <group key={x} position={[x, 0, 0]}>
              <mesh rotation-z={Math.PI / 2} material={brass}>
                <cylinderGeometry args={[0.011, 0.011, 0.16, 12, 1, false, 0, Math.PI]} />
              </mesh>
              {[-0.055, 0.055].map((sx) => (
                <mesh key={sx} position={[sx, 0.055, -0.01]} rotation-x={-0.18} material={brass}>
                  <cylinderGeometry args={[0.0035, 0.0035, 0.11, 8]} />
                </mesh>
              ))}
            </group>
          ))}
        </group>
        <Spot
          ref={picL}
          position={[-0.34, 2.0, 0.26]}
          target={[-0.45, 0.9, -0.1]}
          angle={0.75}
          penumbra={0.9}
          intensity={0}
          distance={3.2}
          decay={1.5}
          color="#ffd9a3"
        />
        <Spot
          ref={picR}
          position={[0.34, 2.0, 0.26]}
          target={[0.3, 0.9, -0.1]}
          angle={0.75}
          penumbra={0.9}
          intensity={0}
          distance={3.2}
          decay={1.5}
          color="#ffd9a3"
        />
        {/* soft cavity fill so the interior never reads as a cave */}
        <pointLight ref={cavityFill} position={[0.2, 1.12, 0.2]} intensity={0} decay={2} distance={2.2} color="#e9c99d" />
      </group>

      {/* doors */}
      <Door side="left" doorRef={doorL} materials={doorMats} />
      <Door side="right" doorRef={doorR} keyRef={keyRef} materials={doorMats} />

      <Choreography doorL={doorL} doorR={doorR} keyRef={keyRef} picL={picL} picR={picR} cavityFill={cavityFill} drawer={drawer} />
    </group>
  )
}
