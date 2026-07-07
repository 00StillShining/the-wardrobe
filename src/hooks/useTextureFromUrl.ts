import { useEffect, useState } from 'react'
import * as THREE from 'three'

/** Load a THREE.Texture from an object URL, sRGB + disposed on change. */
export function useTextureFromUrl(url: string | null): THREE.Texture | null {
  const [tex, setTex] = useState<THREE.Texture | null>(null)
  useEffect(() => {
    if (!url) {
      setTex(null)
      return
    }
    let alive = true
    const loader = new THREE.TextureLoader()
    loader.load(url, (t) => {
      t.colorSpace = THREE.SRGBColorSpace
      t.anisotropy = 8
      t.generateMipmaps = true
      t.minFilter = THREE.LinearMipmapLinearFilter
      if (alive) setTex(t)
      else t.dispose()
    })
    return () => {
      alive = false
    }
  }, [url])
  return tex
}
