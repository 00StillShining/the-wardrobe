import type {
  BoardElementInput,
  StyleBoardCreate,
  StyleBoardRepository,
  StyleBoardUpdate,
} from '../contracts'
import type { BoardElement, StyleBoard } from '../../data/types'
import { AppError } from '../errors'
import type { KeyValueStore } from './stores'
import { defaultNewId, defaultNow, JsonCollection, LOCAL_USER_ID, type LocalClock } from './shared'

/** Mirrors the primary key: an element id may appear once per save. */
const assertUniqueElementIds = (boardId: string, inputs: BoardElementInput[]): void => {
  const seen = new Set<string>()
  for (const input of inputs) {
    if (input.id === undefined) continue
    if (seen.has(input.id)) {
      throw new AppError('conflict', `Board ${boardId} lists element ${input.id} twice`)
    }
    seen.add(input.id)
  }
}

const byZIndex = (a: BoardElement, b: BoardElement): number =>
  a.zIndex !== b.zIndex ? a.zIndex - b.zIndex : a.createdAt.localeCompare(b.createdAt)

export class LocalStyleBoardRepository implements StyleBoardRepository {
  private readonly boards: JsonCollection<StyleBoard>
  private readonly elements: JsonCollection<BoardElement>
  private readonly now: () => string
  private readonly newId: () => string

  constructor(kv: KeyValueStore, clock: LocalClock = {}) {
    this.boards = new JsonCollection<StyleBoard>(kv, 'style-boards')
    this.elements = new JsonCollection<BoardElement>(kv, 'board-elements')
    this.now = clock.now ?? defaultNow
    this.newId = clock.newId ?? defaultNewId
  }

  async list(): Promise<StyleBoard[]> {
    return this.boards
      .read()
      .filter((board) => board.deletedAt === null)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  async get(id: string): Promise<StyleBoard | null> {
    const board = this.boards.read().find((entry) => entry.id === id)
    return board !== undefined && board.deletedAt === null ? board : null
  }

  async create(input: StyleBoardCreate): Promise<StyleBoard> {
    const now = this.now()
    const board: StyleBoard = {
      id: this.newId(),
      userId: LOCAL_USER_ID,
      title: input.title,
      documentVersion: 1,
      canvasWidth: input.canvasWidth,
      canvasHeight: input.canvasHeight,
      coverImagePath: null,
      exportImagePath: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    }
    const boards = this.boards.read()
    boards.push(board)
    this.boards.write(boards)
    return board
  }

  async update(id: string, patch: StyleBoardUpdate): Promise<StyleBoard> {
    const boards = this.boards.read()
    const index = boards.findIndex((entry) => entry.id === id && entry.deletedAt === null)
    if (index === -1) throw new AppError('not-found', `Style board ${id} does not exist`)

    const current = boards[index]
    // Canvas geometry is part of the document (contract bump rule); title,
    // cover and export paths are metadata and leave documentVersion alone.
    const canvasChanged =
      (patch.canvasWidth !== undefined && patch.canvasWidth !== current.canvasWidth) ||
      (patch.canvasHeight !== undefined && patch.canvasHeight !== current.canvasHeight)
    const next: StyleBoard = {
      ...current,
      title: patch.title !== undefined ? patch.title : current.title,
      canvasWidth: patch.canvasWidth !== undefined ? patch.canvasWidth : current.canvasWidth,
      canvasHeight: patch.canvasHeight !== undefined ? patch.canvasHeight : current.canvasHeight,
      coverImagePath:
        patch.coverImagePath !== undefined ? patch.coverImagePath : current.coverImagePath,
      exportImagePath:
        patch.exportImagePath !== undefined ? patch.exportImagePath : current.exportImagePath,
      documentVersion: canvasChanged ? current.documentVersion + 1 : current.documentVersion,
      updatedAt: this.now(),
    }
    boards[index] = next
    this.boards.write(boards)
    return next
  }

  async softDelete(id: string): Promise<void> {
    const boards = this.boards.read()
    const index = boards.findIndex((entry) => entry.id === id)
    if (index === -1) throw new AppError('not-found', `Style board ${id} does not exist`)
    if (boards[index].deletedAt !== null) return // idempotent
    boards[index] = { ...boards[index], deletedAt: this.now(), updatedAt: this.now() }
    this.boards.write(boards)
  }

  async listElements(boardId: string): Promise<BoardElement[]> {
    return this.elements
      .read()
      .filter((element) => element.boardId === boardId)
      .sort(byZIndex)
  }

  async saveElements(boardId: string, elements: BoardElementInput[]): Promise<BoardElement[]> {
    const boards = this.boards.read()
    const index = boards.findIndex((entry) => entry.id === boardId && entry.deletedAt === null)
    if (index === -1) throw new AppError('not-found', `Style board ${boardId} does not exist`)
    assertUniqueElementIds(boardId, elements)

    const now = this.now()
    const created = elements.map(
      (input): BoardElement => ({
        id: input.id ?? this.newId(),
        boardId,
        userId: LOCAL_USER_ID,
        kind: input.kind,
        positionX: input.positionX,
        positionY: input.positionY,
        scale: input.scale,
        rotation: input.rotation,
        zIndex: input.zIndex,
        locked: input.locked,
        hidden: input.hidden,
        itemId: input.itemId ?? null,
        mediaPath: input.mediaPath ?? null,
        style: input.style !== undefined ? { ...input.style } : {},
        createdAt: now,
        updatedAt: now,
      }),
    )
    const others = this.elements.read().filter((element) => element.boardId !== boardId)
    this.elements.write([...others, ...created])

    // Every saved element set is a new document revision.
    const board = boards[index]
    boards[index] = { ...board, documentVersion: board.documentVersion + 1, updatedAt: now }
    this.boards.write(boards)
    return created
  }
}
