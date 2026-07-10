import { create } from 'zustand'

/**
 * Curated subset of the current Collection shown as hanging garments in the
 * 3D scene (plan §9.3: the scene mirrors the filter; the 2D list stays the
 * authoritative complete view; never hundreds of live meshes).
 */

export interface SceneGarment {
  id: string
  url: string
}

interface SceneItemsState {
  garments: SceneGarment[]
  setGarments: (garments: SceneGarment[]) => void
}

export const SCENE_GARMENT_CAP = 10

export const useSceneItems = create<SceneItemsState>((set) => ({
  garments: [],
  setGarments: (garments) => set({ garments: garments.slice(0, SCENE_GARMENT_CAP) }),
}))
