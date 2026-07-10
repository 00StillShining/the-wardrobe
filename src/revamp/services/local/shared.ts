/** Shared plumbing for the local backend implementations. */

import { AppError } from '../errors'
import type { KeyValueStore } from './stores'

/** The single deterministic local identity (plan §10.3 local-test impls). */
export const LOCAL_USER_ID = 'local-user'

/** Every localStorage key the local backend touches lives under this prefix. */
export const NAMESPACE = 'wardrobe2:'

export interface LocalClock {
  /** ISO timestamp source; injectable for deterministic tests. */
  now?: () => string
  /** Id source; injectable for deterministic tests. */
  newId?: () => string
}

export const defaultNow = (): string => new Date().toISOString()

export const defaultNewId = (): string => crypto.randomUUID()

/** One JSON document per collection under the 'wardrobe2:' namespace. */
export class JsonCollection<T> {
  private readonly key: string

  constructor(
    private readonly kv: KeyValueStore,
    name: string,
  ) {
    this.key = `${NAMESPACE}${name}`
  }

  read(): T[] {
    const raw = this.kv.get(this.key)
    if (raw === null) return []
    try {
      const parsed: unknown = JSON.parse(raw)
      if (!Array.isArray(parsed)) throw new Error('expected an array')
      return parsed as T[]
    } catch (cause) {
      throw new AppError('storage', `Corrupt local data under '${this.key}'`, cause)
    }
  }

  write(items: T[]): void {
    this.kv.set(this.key, JSON.stringify(items))
  }
}
