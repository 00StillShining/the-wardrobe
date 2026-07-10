import type { ImportJobCreate, ImportJobPatch, ImportJobRepository } from '../contracts'
import { ACTIVE_IMPORT_JOB_STATUSES, type ImportJob } from '../../data/types'
import { AppError } from '../errors'
import type { KeyValueStore } from './stores'
import { defaultNewId, defaultNow, JsonCollection, LOCAL_USER_ID, type LocalClock } from './shared'

export class LocalImportJobRepository implements ImportJobRepository {
  private readonly collection: JsonCollection<ImportJob>
  private readonly now: () => string
  private readonly newId: () => string

  constructor(kv: KeyValueStore, clock: LocalClock = {}) {
    this.collection = new JsonCollection<ImportJob>(kv, 'import-jobs')
    this.now = clock.now ?? defaultNow
    this.newId = clock.newId ?? defaultNewId
  }

  async createIdempotent(input: ImportJobCreate): Promise<ImportJob> {
    const jobs = this.collection.read()
    // Same user + same idempotency key -> the job that already exists.
    const existing = jobs.find(
      (job) => job.userId === LOCAL_USER_ID && job.idempotencyKey === input.idempotencyKey,
    )
    if (existing !== undefined) return existing

    const now = this.now()
    const job: ImportJob = {
      id: this.newId(),
      userId: LOCAL_USER_ID,
      sourceType: input.sourceType ?? 'manual',
      status: 'created',
      progress: 0,
      originalPath: input.originalPath ?? null,
      resultPayload: {},
      resultSchemaVersion: 1,
      errorCode: null,
      errorMessageKey: null,
      idempotencyKey: input.idempotencyKey,
      expiresAt: input.expiresAt ?? null,
      createdAt: now,
      updatedAt: now,
    }
    jobs.push(job)
    this.collection.write(jobs)
    return job
  }

  async updateStatus(id: string, patch: ImportJobPatch): Promise<ImportJob> {
    const jobs = this.collection.read()
    const index = jobs.findIndex((job) => job.id === id)
    if (index === -1) throw new AppError('not-found', `Import job ${id} does not exist`)

    const current = jobs[index]
    const next: ImportJob = {
      ...current,
      status: patch.status !== undefined ? patch.status : current.status,
      progress: patch.progress !== undefined ? patch.progress : current.progress,
      originalPath: patch.originalPath !== undefined ? patch.originalPath : current.originalPath,
      resultPayload:
        patch.resultPayload !== undefined ? { ...patch.resultPayload } : current.resultPayload,
      resultSchemaVersion:
        patch.resultSchemaVersion !== undefined
          ? patch.resultSchemaVersion
          : current.resultSchemaVersion,
      errorCode: patch.errorCode !== undefined ? patch.errorCode : current.errorCode,
      errorMessageKey:
        patch.errorMessageKey !== undefined ? patch.errorMessageKey : current.errorMessageKey,
      updatedAt: this.now(),
    }
    jobs[index] = next
    this.collection.write(jobs)
    return next
  }

  async get(id: string): Promise<ImportJob | null> {
    return this.collection.read().find((job) => job.id === id) ?? null
  }

  async listActive(): Promise<ImportJob[]> {
    return this.collection
      .read()
      .filter((job) => ACTIVE_IMPORT_JOB_STATUSES.includes(job.status))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }
}
