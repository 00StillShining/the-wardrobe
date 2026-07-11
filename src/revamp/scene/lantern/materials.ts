import * as THREE from 'three'
import { useMemo } from 'react'
import { useScene } from '../../stores/scene'

/**
 * Lantern materials — the reference trio: translucent ivory linen, golden
 * woven cane, thin dark case with brass lines. Linen panels TRANSMIT the
 * interior glow (the defining reference quality); reduced quality swaps
 * transmission for an emissive fake at the same read.
 */

function weaveCanvas(base: string, thread: string, cell = 6, jitter = 10): THREE.CanvasTexture {
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = base
  ctx.fillRect(0, 0, size, size)
  ctx.fillStyle = thread
  for (let y = 0; y < size; y += cell) {
    ctx.globalAlpha = 0.22 + (((y * 7919) % jitter) / jitter) * 0.18
    ctx.fillRect(0, y, size, Math.max(1, cell * 0.4))
  }
  for (let x = 0; x < size; x += cell) {
    ctx.globalAlpha = 0.16 + (((x * 104729) % jitter) / jitter) * 0.14
    ctx.fillRect(x, 0, Math.max(1, cell * 0.4), size)
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
    const linenTex = weaveCanvas('#efe7d3', '#c9bfa4', 5)
    linenTex.repeat.set(2.5, 4)
    const caneTex = weaveCanvas('#cfa963', '#7e6330', 14, 8)
    caneTex.repeat.set(3, 5)
    const wallLinenTex = weaveCanvas('#e6dec9', '#c4b99c', 6)
    wallLinenTex.repeat.set(4, 4)
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
        color: '#d8bd84',
        metalness: 1,
        roughness: 0.18,
        envMapIntensity: 2.6,
      }),
      brassBright: new THREE.MeshPhysicalMaterial({
        color: '#c9a967',
        metalness: 1,
        roughness: 0.22,
        envMapIntensity: 1.7,
      }),
      oak: new THREE.MeshStandardMaterial({ color: '#c9ab81', roughness: 0.85, envMapIntensity: 0.4 }),
      felt: new THREE.MeshStandardMaterial({ color: '#2e4636', roughness: 0.98 }),
      mirror: new THREE.MeshPhysicalMaterial({ color: '#c3c9cd', metalness: 1, roughness: 0.04, envMapIntensity: 2.4 }),
      glowStrip: new THREE.MeshStandardMaterial({ color: '#ffe2b0', emissive: '#ffc478', emissiveIntensity: 1.1 }),
      floor: new THREE.MeshStandardMaterial({ color: '#b3aea0', roughness: 0.9 }),
      wall: new THREE.MeshStandardMaterial({ color: '#8a887f', roughness: 0.96 }),
    }
  }, [quality])
}

export type LanternMaterials = ReturnType<typeof useLanternMaterials>
