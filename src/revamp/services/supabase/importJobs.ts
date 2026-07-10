import type { SupabaseClient } from '@supabase/supabase-js'
import type { ImportJobCreate, ImportJobPatch, ImportJobRepository } from '../contracts'
import { ACTIVE_IMPORT_JOB_STATUSES, type ImportJob } from '../../data/types'
import { importJobFromRow, type ImportJobRow } from '../../data/rows'
import { AppError } from '../errors'
import { isUniqueViolation, mapPostgrestError } from './mapError'
import { requireUserId } from './session'

const TABLE = 'import_jobs'

const rowPatchFromPatch = (patch: ImportJobPatch): Record<string, unknown> => {
  const row: Record<string, unknown> = {}
  if (patch.status !== undefined) row.status = patch.status
  if (patch.progress !== undefined) row.progress = patch.progress
  if (patch.originalPath !== undefined) row.original_path = patch.originalPath
  if (patch.resultPayload !== undefined) row.result_payload = patch.resultPayload
  if (patch.resultSchemaVersion !== undefined) {
    row.result_schema_version = patch.resultSchemaVersion
  }
  if (patch.errorCode !== undefined) row.error_code = patch.errorCode
  if (patch.errorMessageKey !== undefined) row.error_message_key = patch.errorMessageKey
  return row
}

export class SupabaseImportJobRepository implements ImportJobRepository {
  constructor(private readonly client: SupabaseClient) {}

  async createIdempotent(input: ImportJobCreate): Promise<ImportJob> {
    const userId = await requireUserId(this.client)
    const insert: Record<string, unknown> = {
      user_id: userId,
      idempotency_key: input.idempotencyKey,
    }
    if (input.sourceType !== undefined) insert.source_type = input.sourceType
    if (input.originalPath !== undefined) insert.original_path = input.originalPath
    if (input.expiresAt !== undefined) insert.expires_at = input.expiresAt

    const { data, error } = await this.client.from(TABLE).insert(insert).select().single()
    if (!error) return importJobFromRow(data as ImportJobRow)

    // UNIQUE(user_id, idempotency_key): a retry raced an earlier create —
    // return the job that already exists for this key.
    if (isUniqueViolation(error)) {
      const { data: existing, error: fetchError } = await this.client
        .from(TABLE)
        .select('*')
        .eq('user_id', userId)
        .eq('idempotency_key', input.idempotencyKey)
        .single()
      if (fetchError) throw mapPostgrestError(fetchError)
      return importJobFromRow(existing as ImportJobRow)
    }
    throw mapPostgrestError(error)
  }

  async updateStatus(id: string, patch: ImportJobPatch): Promise<ImportJob> {
    const { data, error } = await this.client
      .from(TABLE)
      .update(rowPatchFromPatch(patch))
      .eq('id', id)
      .select()
      .maybeSingle()
    if (error) throw mapPostgrestError(error)
    if (!data) throw new AppError('not-found', `Import job ${id} does not exist`)
    return importJobFromRow(data as ImportJobRow)
  }

  async get(id: string): Promise<ImportJob | null> {
    const { data, error } = await this.client
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw mapPostgrestError(error)
    return data ? importJobFromRow(data as ImportJobRow) : null
  }

  async listActive(): Promise<ImportJob[]> {
    const { data, error } = await this.client
      .from(TABLE)
      .select('*')
      .in('status', [...ACTIVE_IMPORT_JOB_STATUSES])
      .order('created_at', { ascending: false })
    if (error) throw mapPostgrestError(error)
    return (data as ImportJobRow[]).map(importJobFromRow)
  }
}
