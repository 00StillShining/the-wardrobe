import { Suspense, useCallback, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Experience } from './scene/Experience'
import { FrameDriver } from './scene/FrameDriver'
import { Overlay } from './ui/Overlay'
import { useItems } from './state/items'
import { useSheets } from './state/sheets'
import { initializeStorage } from './adapters/storage/StorageAdapter'
import { resetWardrobe } from './state/reset'
import { usePreferences } from './state/preferences'
import { useNav } from './state/navigation'

type StorageState = 'loading' | 'ready' | 'incompatible'

function StorageRecovery({ onReset }: { onReset: () => Promise<void> }) {
  const [resetting, setResetting] = useState(false)
  const [failed, setFailed] = useState(false)

  const reset = async () => {
    if (!window.confirm('Reset all wardrobe data stored on this device?')) return
    setResetting(true)
    setFailed(false)
    try {
      await onReset()
    } catch (error) {
      console.warn('[storage] recovery reset failed', error)
      setFailed(true)
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="storage-recovery paper" role="alert">
      <h1 className="paper-serif">Storage needs attention</h1>
      <p>This version cannot safely read the wardrobe data already on this device.</p>
      <button type="button" className="btn btn-primary" onClick={reset} disabled={resetting}>
        {resetting ? 'Resetting…' : 'Reset local data'}
      </button>
      {failed && <p className="recovery-error">Reset failed. Please check your browser storage settings and try again.</p>}
    </div>
  )
}

export default function App() {
  const [storageState, setStorageState] = useState<StorageState>('loading')

  const boot = useCallback(async () => {
    const status = initializeStorage()
    if (status === 'incompatible') {
      setStorageState('incompatible')
      return
    }
    await useItems.getState().init()
    useSheets.getState().init()
    usePreferences.getState().init()
    useNav.setState({ fullMotion: !usePreferences.getState().reducedMotion })
    setStorageState('ready')
  }, [])

  useEffect(() => {
    void boot()
  }, [boot])

  const reset = useCallback(async () => {
    await resetWardrobe()
    await boot()
  }, [boot])

  return (
    <>
      <Canvas
        shadows
        dpr={[1, 1.5]}
        frameloop="demand"
        gl={{ antialias: false, powerPreference: 'high-performance' }}
        camera={{ fov: 34, near: 0.08, far: 30, position: [0.58, 1.45, 4.95] }}
      >
        <FrameDriver fps={60} />
        <Suspense fallback={null}>
          <Experience />
        </Suspense>
      </Canvas>
      {storageState === 'incompatible' ? <StorageRecovery onReset={reset} /> : <Overlay onReset={reset} booting={storageState === 'loading'} />}
    </>
  )
}
