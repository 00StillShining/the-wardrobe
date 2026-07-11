import * as THREE from 'three'
import { useMemo } from 'react'
import { useScene } from '../../stores/scene'

/**
 * Lantern materials — the reference trio: translucent ivory linen, golden
 * woven cane, thin dark case with brass lines. Linen panels TRANSMIT the
 * interior glow (the defining reference quality); reduced quality swaps
 * transmission for an emissive fake at the same read.
 */

function weaveCanvas(base: string, thread: string, cell = 6, jitter = 10, mottle = 0): THREE.CanvasTexture {
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = base
  ctx.fillRect(0, 0, size, size)
  // low-frequency mottling so large fields never read flat
  if (mottle > 0) {
    for (let i = 0; i < 26; i++) {
      const cx = ((i * 7919) % size)
      const cy = ((i * 104729) % size)
      const r = 60 + ((i * 31) % 90)
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
      const dark = i % 2 === 0
      g.addColorStop(0, dark ? `rgba(70,60,40,${mottle})` : `rgba(255,250,235,${mottle})`)
      g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, size, size)
    }
  }
  ctx.fillStyle = thread
  for (let y = 0; y < size; y += cell) {
    ctx.globalAlpha = 0.26 + (((y * 7919) % jitter) / jitter) * 0.2
    ctx.fillRect(0, y, size, Math.max(1, cell * 0.42))
  }
  for (let x = 0; x < size; x += cell) {
    ctx.globalAlpha = 0.2 + (((x * 104729) % jitter) / jitter) * 0.16
    ctx.fillRect(x, 0, Math.max(1, cell * 0.42), size)
  }
  // woven cane reads as a grid of shadowed holes
  if (cell >= 12) {
    ctx.globalAlpha = 0.5
    ctx.fillStyle = 'rgba(40,28,10,0.55)'
    for (let y = cell / 2; y < size; y += cell) {
      for (let x = cell / 2; x < size; x += cell) {
        ctx.beginPath()
        ctx.arc(x, y, cell * 0.16, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }
  ctx.globalAlpha = 1
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return tex
}

export function useLanternMaterials() {
  const quality = useScene((s) => s.quality)
  return useMemo(() => {
    const linenTex = weaveCanvas('#efe7d3', '#c9bfa4', 5, 10, 0.05)
    linenTex.repeat.set(2.5, 4)
    const caneTex = weaveCanvas('#d4ad64', '#7e6330', 16, 8, 0.04)
    caneTex.repeat.set(3, 5)
    const wallLinenTex = weaveCanvas('#e8dfc9', '#bfb294', 9, 10, 0.06)
    wallLinenTex.repeat.set(2.5, 2.5)
    const rugTex = weaveCanvas('#d6d1c2', '#b5ae9a', 4)
    rugTex.repeat.set(10, 6)

    const cheap = quality === 'reduced'
    const linenPanel = cheap
      ? new THREE.MeshStandardMaterial({
          map: linenTex,
          color: '#f4ecd8',
          roughness: 0.92,
          emissive: new THREE.Color('#ffdfae'),
          emissiveMap: linenTex,
          emissiveIntensity: 0.32,
        })
      : new THREE.MeshPhysicalMaterial({
          map: linenTex,
          color: '#f4ecd8',
          roughness: 0.88,
          transmission: 0.55,
          thickness: 0.02,
          ior: 1.15,
          envMapIntensity: 0.4,
        })

    return {
      linenPanel,
      cane: new THREE.MeshStandardMaterial({ map: caneTex, color: '#c2a05f', roughness: 0.86, envMapIntensity: 0.5 }),
      wallLinen: new THREE.MeshStandardMaterial({ map: wallLinenTex, roughness: 0.95, envMapIntensity: 0.3 }),
      rug: new THREE.MeshStandardMaterial({ map: rugTex, roughness: 0.98 }),
      case: new THREE.MeshStandardMaterial({ color: '#232324', roughness: 0.45, metalness: 0.15, envMapIntensity: 0.7 }),
      brass: new THREE.MeshPhysicalMaterial({
        color: '#b08d57',
        metalness: 1,
        roughness: 0.32,
        clearcoat: 0.3,
        clearcoatRoughness: 0.3,
        envMapIntensity: 1.4,
      }),
      pull: new THREE.MeshPhysicalMaterial({
        color: '#e2ca92',
        metalness: 1,
        roughness: 0.14,
        envMapIntensity: 3.2,
      }),
      brassBright: new THREE.MeshPhysicalMaterial({
        color: '#c9a967',
        metalness: 1,
        roughness: 0.22,
        envMapIntensity: 1.7,
      }),
      oak: new THREE.MeshStandardMaterial({ color: '#c9ab81', roughness: 0.85, envMapIntensity: 0.4 }),
      felt: new THREE.MeshStandardMaterial({ color: '#2e4636', roughness: 0.98 }),
      mirror: new THREE.MeshPhysicalMaterial({ color: '#d6dde2', metalness: 1, roughness: 0.03, envMapIntensity: 3.0 }),
      glowStrip: new THREE.MeshStandardMaterial({ color: '#ffe2b0', emissive: '#ffc478', emissiveIntensity: 1.1 }),
      floor: new THREE.MeshStandardMaterial({ color: '#b3aea0', roughness: 0.9 }),
      wall: new THREE.MeshStandardMaterial({ color: '#8a887f', roughness: 0.96 }),
    }
  }, [quality])
}

export type LanternMaterials = ReturnType<typeof useLanternMaterials>
