import { useEffect, useState } from 'react'
import { objectUrlFor, cachedObjectUrl } from '../adapters/storage/StorageAdapter'

/**
 * Resolve a StorageAdapter blob key to a live object URL, cached per session.
 * Returns null until ready; synchronous cache hit avoids a flash on re-mount.
 */
export function useObjectUrl(key: string | undefined): string | null {
  const [url, setUrl] = useState<string | null>(() => (key ? cachedObjectUrl(key) : null))

  useEffect(() => {
    if (!key) {
      setUrl(null)
      return
    }
    const cached = cachedObjectUrl(key)
    if (cached) {
      setUrl(cached)
      return
    }
    let alive = true
    objectUrlFor(key).then((u) => {
      if (alive) setUrl(u)
    })
    return () => {
      alive = false
    }
  }, [key])

  return url
}
