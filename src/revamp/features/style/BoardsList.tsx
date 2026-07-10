import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Palette } from 'lucide-react'
import s from './style.module.css'
import { Button, EmptyState, Menu, Skeleton, useToast } from '../../shared/ui'
import { useBackend } from '../../app/backend'
import { autoLayout, BOARD_CANVAS } from './boardModel'
import type { StyleBoard } from '../../data/types'

function BoardCard({ board }: { board: StyleBoard }) {
  const backend = useBackend()
  const cover = useQuery({
    queryKey: ['boardCover', board.id, board.coverImagePath],
    queryFn: () =>
      board.coverImagePath ? backend.media.getObjectUrl('derivatives', board.coverImagePath) : Promise.resolve(null),
  })
  return (
    <Link to={`/app/style/${board.id}`} className={s.boardCard}>
      <span className={s.boardCover}>{cover.data ? <img src={cover.data} alt="" /> : <Palette aria-hidden />}</span>
      <span className={s.boardTitle}>{board.title}</span>
      <span className={s.boardMeta}>v{board.documentVersion}</span>
    </Link>
  )
}

export function BoardsList() {
  const backend = useBackend()
  const toast = useToast()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const boards = useQuery({ queryKey: ['boards'], queryFn: () => backend.styleBoards.list() })

  const createBoard = useMutation({
    mutationFn: async () => {
      const board = await backend.styleBoards.create({
        title: 'New board',
        canvasWidth: BOARD_CANVAS.width,
        canvasHeight: BOARD_CANVAS.height,
      })
      // default layout from the most recent owned garments — already
      // intentional before any manual edit (plan §9.7)
      const items = (await backend.wardrobe.list({ ownershipStatus: 'owned', sort: 'newest' })).slice(0, 5)
      if (items.length > 0) {
        const palette = items[0].palette ?? []
        const doc = autoLayout(
          items.map((i) => ({ itemId: i.id, layerType: i.layerType })),
          palette,
          'New board',
        )
        await backend.styleBoards.saveElements(
          board.id,
          doc.map((e) => ({
            kind: e.kind,
            positionX: e.x,
            positionY: e.y,
            scale: e.width,
            rotation: e.rotation,
            zIndex: e.zIndex,
            locked: e.locked,
            hidden: e.hidden,
            itemId: e.itemId ?? null,
            style: { color: e.color ?? null, text: e.text ?? null },
          })),
        )
      }
      return board
    },
    onSuccess: (board) => {
      queryClient.invalidateQueries({ queryKey: ['boards'] })
      navigate(`/app/style/${board.id}`)
    },
    onError: () => toast('Could not create the board.', { tone: 'danger' }),
  })

  const remove = useMutation({
    mutationFn: (id: string) => backend.styleBoards.softDelete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards'] })
      toast('Board deleted', { tone: 'danger' })
    },
  })

  if (boards.isPending) {
    return (
      <div className={s.boardGrid}>
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} height={160} radius="m" />
        ))}
      </div>
    )
  }

  if (!boards.data || boards.data.length === 0) {
    return (
      <EmptyState
        figure={<Palette aria-hidden />}
        title="No boards yet"
        hint="Boards compose your cutouts, swatches and captions on a linen canvas, then export at print resolution."
        action={
          <Button variant="primary" onClick={() => createBoard.mutate()} loading={createBoard.isPending}>
            New board
          </Button>
        }
      />
    )
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-4)' }}>
        <Button variant="primary" onClick={() => createBoard.mutate()} loading={createBoard.isPending}>
          New board
        </Button>
      </div>
      <div className={s.boardGrid}>
        {boards.data.map((b) => (
          <div key={b.id} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            <BoardCard board={b} />
            <Menu trigger="Actions" items={[{ label: 'Delete', onSelect: () => remove.mutate(b.id), danger: true }]} />
          </div>
        ))}
      </div>
    </>
  )
}
