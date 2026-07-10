import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  BoardElementInput,
  StyleBoardCreate,
  StyleBoardRepository,
  StyleBoardUpdate,
} from '../contracts'
import type { BoardElement, StyleBoard } from '../../data/types'
import {
  boardElementFromRow,
  styleBoardFromRow,
  type BoardElementRow,
  type StyleBoardRow,
} from '../../data/rows'
import { AppError } from '../errors'
import { mapPostgrestError } from './mapError'
import { requireUserId } from './session'

const TABLE = 'style_boards'
const ELEMENTS_TABLE = 'board_elements'

const elementRowFromInput = (
  boardId: string,
  userId: string,
  input: BoardElementInput,
): Record<string, unknown> => {
  const row: Record<string, unknown> = {
    board_id: boardId,
    user_id: userId,
    kind: input.kind,
    position_x: input.positionX,
    position_y: input.positionY,
    scale: input.scale,
    rotation: input.rotation,
    z_index: input.zIndex,
    locked: input.locked,
    hidden: input.hidden,
  }
  if (input.id !== undefined) row.id = input.id
  if (input.itemId !== undefined) row.item_id = input.itemId
  if (input.mediaPath !== undefined) row.media_path = input.mediaPath
  if (input.style !== undefined) row.style = input.style
  return row
}

export class SupabaseStyleBoardRepository implements StyleBoardRepository {
  constructor(private readonly client: SupabaseClient) {}

  async list(): Promise<StyleBoard[]> {
    const { data, error } = await this.client
      .from(TABLE)
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
    if (error) throw mapPostgrestError(error)
    return (data as StyleBoardRow[]).map(styleBoardFromRow)
  }

  async get(id: string): Promise<StyleBoard | null> {
    const { data, error } = await this.client
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle()
    if (error) throw mapPostgrestError(error)
    return data ? styleBoardFromRow(data as StyleBoardRow) : null
  }

  async create(input: StyleBoardCreate): Promise<StyleBoard> {
    const userId = await requireUserId(this.client)
    const insert: Record<string, unknown> = {
      user_id: userId,
      title: input.title,
      canvas_width: input.canvasWidth,
      canvas_height: input.canvasHeight,
    }
    const { data, error } = await this.client.from(TABLE).insert(insert).select().single()
    if (error) throw mapPostgrestError(error)
    return styleBoardFromRow(data as StyleBoardRow)
  }

  async update(id: string, patch: StyleBoardUpdate): Promise<StyleBoard> {
    const current = await this.get(id)
    if (!current) throw new AppError('not-found', `Style board ${id} does not exist`)

    const row: Record<string, unknown> = {}
    if (patch.title !== undefined) row.title = patch.title
    if (patch.canvasWidth !== undefined) row.canvas_width = patch.canvasWidth
    if (patch.canvasHeight !== undefined) row.canvas_height = patch.canvasHeight
    if (patch.coverImagePath !== undefined) row.cover_image_path = patch.coverImagePath
    if (patch.exportImagePath !== undefined) row.export_image_path = patch.exportImagePath

    // Canvas geometry is part of the document (contract bump rule); title,
    // cover and export paths are metadata and leave documentVersion alone.
    const canvasChanged =
      (patch.canvasWidth !== undefined && patch.canvasWidth !== current.canvasWidth) ||
      (patch.canvasHeight !== undefined && patch.canvasHeight !== current.canvasHeight)
    if (canvasChanged) row.document_version = current.documentVersion + 1

    const { data, error } = await this.client
      .from(TABLE)
      .update(row)
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .maybeSingle()
    if (error) throw mapPostgrestError(error)
    if (!data) throw new AppError('not-found', `Style board ${id} does not exist`)
    return styleBoardFromRow(data as StyleBoardRow)
  }

  async softDelete(id: string): Promise<void> {
    const { data, error } = await this.client
      .from(TABLE)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null)
      .select('id')
      .maybeSingle()
    if (error) throw mapPostgrestError(error)
    if (data) return

    // Zero rows: either already soft-deleted (idempotent success) or absent.
    const { data: existing, error: existsError } = await this.client
      .from(TABLE)
      .select('id')
      .eq('id', id)
      .maybeSingle()
    if (existsError) throw mapPostgrestError(existsError)
    if (!existing) throw new AppError('not-found', `Style board ${id} does not exist`)
  }

  async listElements(boardId: string): Promise<BoardElement[]> {
    const { data, error } = await this.client
      .from(ELEMENTS_TABLE)
      .select('*')
      .eq('board_id', boardId)
      .order('z_index', { ascending: true })
      .order('created_at', { ascending: true })
    if (error) throw mapPostgrestError(error)
    return (data as BoardElementRow[]).map(boardElementFromRow)
  }

  async saveElements(boardId: string, elements: BoardElementInput[]): Promise<BoardElement[]> {
    const userId = await requireUserId(this.client)
    const board = await this.get(boardId)
    if (!board) throw new AppError('not-found', `Style board ${boardId} does not exist`)

    // Replace = delete + insert + version bump, sequential because PostgREST
    // has no client-side transactions: a failure part-way can leave the board
    // empty or its documentVersion unbumped. Re-saving converges; a Postgres
    // function would make the whole save atomic.
    const { error: deleteError } = await this.client
      .from(ELEMENTS_TABLE)
      .delete()
      .eq('board_id', boardId)
    if (deleteError) throw mapPostgrestError(deleteError)

    let saved: BoardElement[] = []
    if (elements.length > 0) {
      const rows = elements.map((input) => elementRowFromInput(boardId, userId, input))
      const { data, error } = await this.client.from(ELEMENTS_TABLE).insert(rows).select()
      if (error) throw mapPostgrestError(error)
      saved = (data as BoardElementRow[]).map(boardElementFromRow)
    }

    // Every saved element set is a new document revision.
    const { error: bumpError } = await this.client
      .from(TABLE)
      .update({ document_version: board.documentVersion + 1 })
      .eq('id', boardId)
    if (bumpError) throw mapPostgrestError(bumpError)
    return saved
  }
}
