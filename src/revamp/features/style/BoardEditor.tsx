import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Konva from 'konva'
import { Image as KonvaImage, Layer, Line, Rect, Stage, Text, Transformer } from 'react-konva'
import s from './style.module.css'
import { Button, EmptyState, Skeleton, TextField, useToast } from '../../shared/ui'
import { useBackend } from '../../app/backend'
import { BOARD_CANVAS, elementId, type BoardElementDoc } from './boardModel'
import { useBoardEditor } from './boardStore'
import { useItemImage } from '../collection/CollectionView'
import type { BoardElementInput } from '../../services/contracts'

const CW = BOARD_CANVAS.width
const CH = BOARD_CANVAS.height
const SNAP = 10 // canvas px

function toInputs(elements: BoardElementDoc[]): BoardElementInput[] {
  return elements.map((e) => ({
    id: e.id.startsWith('el-') ? undefined : e.id,
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
  }))
}

function useElementImage(itemId: string | undefined) {
  const image = useItemImage(itemId ?? '', 'display')
  const [el, setEl] = useState<HTMLImageElement | null>(null)
  useEffect(() => {
    if (!image.data) return
    const img = new window.Image()
    img.onload = () => setEl(img)
    img.src = image.data
  }, [image.data])
  return el
}

function GarmentNode({
  element,
  draggable,
  onSelect,
  onDragMove,
  onCommit,
  register,
}: {
  element: BoardElementDoc
  draggable: boolean
  onSelect: () => void
  onDragMove: (e: Konva.KonvaEventObject<DragEvent>) => void
  onCommit: (patch: Partial<BoardElementDoc>) => void
  register: (id: string, node: Konva.Node | null) => void
}) {
  const img = useElementImage(element.itemId)
  if (!img) return null
  const w = element.width * CW
  const h = (img.height / img.width) * w
  return (
    <KonvaImage
      ref={(node) => register(element.id, node)}
      image={img}
      x={element.x * CW}
      y={element.y * CH}
      offsetX={w / 2}
      offsetY={h / 2}
      width={w}
      height={h}
      rotation={element.rotation}
      draggable={draggable}
      visible={!element.hidden}
      onClick={onSelect}
      onTap={onSelect}
      onDragMove={onDragMove}
      onDragEnd={(e) => onCommit({ x: e.target.x() / CW, y: e.target.y() / CH })}
      onTransformEnd={(e) => {
        const node = e.target
        onCommit({
          x: node.x() / CW,
          y: node.y() / CH,
          width: (node.width() * node.scaleX()) / CW,
          rotation: node.rotation(),
        })
        node.scaleX(1)
        node.scaleY(1)
      }}
    />
  )
}

export function BoardEditor() {
  const { boardId = '' } = useParams()
  const backend = useBackend()
  const toast = useToast()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const editor = useBoardEditor()
  const stageRef = useRef<Konva.Stage>(null)
  const trRef = useRef<Konva.Transformer>(null)
  const nodes = useRef(new Map<string, Konva.Node>())
  const [guides, setGuides] = useState<{ x?: number; y?: number }>({})
  const [stageW, setStageW] = useState(640)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [exporting, setExporting] = useState(false)

  const board = useQuery({
    queryKey: ['board', boardId],
    queryFn: async () => {
      const b = await backend.styleBoards.get(boardId)
      if (!b) return null
      const els = await backend.styleBoards.listElements(boardId)
      return { board: b, elements: els }
    },
  })

  const items = useQuery({ queryKey: ['wardrobe', 'list', 'boards'], queryFn: () => backend.wardrobe.list({}) })

  // hydrate the editor from persistence
  useEffect(() => {
    if (!board.data) return
    const els: BoardElementDoc[] = board.data.elements.map((e) => ({
      id: e.id,
      kind: (e.kind as BoardElementDoc['kind']) ?? 'garment',
      x: e.positionX,
      y: e.positionY,
      width: e.scale,
      rotation: e.rotation,
      zIndex: e.zIndex,
      locked: e.locked,
      hidden: e.hidden,
      itemId: e.itemId ?? undefined,
      color: (e.style?.color as string) ?? undefined,
      text: (e.style?.text as string) ?? undefined,
    }))
    editor.load(board.data.board.id, board.data.board.title, els)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board.data])

  // container-fitted stage
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setStageW(el.clientWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const scale = (stageW / CW) * editor.zoom

  // autosave: debounce dirty → saveElements + title
  useEffect(() => {
    if (editor.saveState !== 'dirty' || !editor.boardId) return
    const t = window.setTimeout(async () => {
      editor.setSaveState('saving')
      try {
        await backend.styleBoards.update(editor.boardId!, { title: editor.title.trim() || 'Untitled board' })
        await backend.styleBoards.saveElements(editor.boardId!, toInputs(editor.elements))
        editor.setSaveState('saved')
        queryClient.invalidateQueries({ queryKey: ['boards'] })
      } catch {
        editor.setSaveState('error')
      }
    }, 1200)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor.saveState, editor.elements, editor.title])

  // keyboard: delete, nudge, undo/redo
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
      const sel = editor.elements.find((el) => el.id === editor.selectedId)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        e.shiftKey ? editor.redo() : editor.undo()
        return
      }
      if (!sel || sel.locked) return
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault()
        editor.apply(editor.elements.filter((el) => el.id !== sel.id))
        editor.select(null)
      }
      const step = (e.shiftKey ? 10 : 1) / CW
      if (e.key === 'ArrowLeft') editor.patchElement(sel.id, { x: sel.x - step })
      if (e.key === 'ArrowRight') editor.patchElement(sel.id, { x: sel.x + step })
      if (e.key === 'ArrowUp') editor.patchElement(sel.id, { y: sel.y - (e.shiftKey ? 10 : 1) / CH })
      if (e.key === 'ArrowDown') editor.patchElement(sel.id, { y: sel.y + (e.shiftKey ? 10 : 1) / CH })
      if (e.key === 'Escape') editor.select(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [editor])

  // transformer follows selection
  useEffect(() => {
    const tr = trRef.current
    if (!tr) return
    const node = editor.selectedId ? nodes.current.get(editor.selectedId) : null
    tr.nodes(node ? [node] : [])
    tr.getLayer()?.batchDraw()
  }, [editor.selectedId, editor.elements])

  const register = useCallback((id: string, node: Konva.Node | null) => {
    if (node) nodes.current.set(id, node)
    else nodes.current.delete(id)
  }, [])

  // snap to canvas centre/edges/thirds while dragging
  const onDragMove = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target
    const anchorsX = [CW / 2, CW / 3, (2 * CW) / 3, 0, CW]
    const anchorsY = [CH / 2, CH / 3, (2 * CH) / 3, 0, CH]
    const g: { x?: number; y?: number } = {}
    for (const ax of anchorsX) {
      if (Math.abs(node.x() - ax) < SNAP) {
        node.x(ax)
        g.x = ax
        break
      }
    }
    for (const ay of anchorsY) {
      if (Math.abs(node.y() - ay) < SNAP) {
        node.y(ay)
        g.y = ay
        break
      }
    }
    setGuides(g)
  }, [])

  const clearGuides = useCallback(() => setGuides({}), [])

  const sorted = useMemo(() => [...editor.elements].sort((a, b) => a.zIndex - b.zIndex), [editor.elements])
  const selected = editor.elements.find((e) => e.id === editor.selectedId) ?? null

  function addGarment(itemId: string) {
    editor.apply([
      ...editor.elements,
      {
        id: elementId(),
        kind: 'garment',
        itemId,
        x: 0.5,
        y: 0.5,
        width: 0.2,
        rotation: 0,
        zIndex: Math.max(0, ...editor.elements.map((e) => e.zIndex)) + 1,
        locked: false,
        hidden: false,
      },
    ])
  }

  function addSwatch(color: string) {
    editor.apply([
      ...editor.elements,
      {
        id: elementId(),
        kind: 'swatch',
        color,
        x: 0.15,
        y: 0.8,
        width: 0.06,
        rotation: 0,
        zIndex: Math.max(0, ...editor.elements.map((e) => e.zIndex)) + 1,
        locked: false,
        hidden: false,
      },
    ])
  }

  function addCaption() {
    editor.apply([
      ...editor.elements,
      {
        id: elementId(),
        kind: 'caption',
        text: 'Caption',
        x: 0.5,
        y: 0.12,
        width: 0.3,
        rotation: 0,
        zIndex: Math.max(0, ...editor.elements.map((e) => e.zIndex)) + 1,
        locked: false,
        hidden: false,
      },
    ])
  }

  async function exportBoard() {
    if (!editor.boardId) return
    setExporting(true)
    try {
      // deterministic: hide transformer/guides, export the full canvas at 2×
      editor.select(null)
      await new Promise((r) => setTimeout(r, 60))
      const stage = stageRef.current!
      const dataUrl = stage.toDataURL({
        x: 0,
        y: 0,
        width: CW * scale,
        height: CH * scale,
        pixelRatio: (CW * 2) / (CW * scale),
        mimeType: 'image/png',
      })
      const blob = await (await fetch(dataUrl)).blob()
      const path = await backend.media.upload({
        bucket: 'exports',
        key: `boards/${editor.boardId}/export.png`,
        blob,
        contentType: 'image/png',
        upsert: true,
      })
      // cover derives from the same render
      const coverUrl = stage.toDataURL({
        x: 0,
        y: 0,
        width: CW * scale,
        height: CH * scale,
        pixelRatio: 400 / (CW * scale),
        mimeType: 'image/png',
      })
      const coverBlob = await (await fetch(coverUrl)).blob()
      const coverPath = await backend.media.upload({
        bucket: 'derivatives',
        key: `boards/${editor.boardId}/cover.png`,
        blob: coverBlob,
        contentType: 'image/png',
        upsert: true,
      })
      await backend.styleBoards.update(editor.boardId, { exportImagePath: path, coverImagePath: coverPath })
      queryClient.invalidateQueries({ queryKey: ['boards'] })
      // hand the file to the user
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `${editor.title.trim() || 'style-board'}.png`
      a.click()
      URL.revokeObjectURL(a.href)
      toast('Exported at 2× — download started', { tone: 'success' })
    } catch {
      toast('Export failed — the board is unchanged.', { tone: 'danger' })
    } finally {
      setExporting(false)
    }
  }

  if (board.isPending) return <Skeleton height={420} radius="m" />
  if (!board.data)
    return (
      <EmptyState
        title="This board is gone"
        action={<Button onClick={() => navigate('/app/style')}>Back to boards</Button>}
      />
    )

  const palette = (items.data ?? []).flatMap((i) => i.palette ?? []).slice(0, 6)

  return (
    <div className={s.editor}>
      <div className={s.topRow}>
        <TextField label="Title" value={editor.title} onChange={(e) => editor.setTitle(e.target.value)} />
        <span className={s.saveState} role="status">
          {editor.saveState === 'saved' && 'Saved'}
          {editor.saveState === 'saving' && 'Saving…'}
          {editor.saveState === 'dirty' && 'Unsaved changes'}
          {editor.saveState === 'error' && 'Autosave failed — retrying on next change'}
        </span>
      </div>

      <div className={s.canvasWrap} ref={wrapRef} data-testid="board-canvas">
        <Stage
          ref={stageRef}
          width={stageW}
          height={(CH / CW) * stageW * editor.zoom}
          scaleX={scale}
          scaleY={scale}
          onMouseDown={(e) => {
            if (e.target === e.target.getStage()) editor.select(null)
          }}
        >
          <Layer>
            <Rect x={0} y={0} width={CW} height={CH} fill="#ece5d5" />
            {sorted.map((el) => {
              const common = {
                draggable: !el.locked,
                onSelect: () => editor.select(el.id),
                onDragMove,
                onCommit: (patch: Partial<BoardElementDoc>) => {
                  clearGuides()
                  editor.patchElement(el.id, patch)
                },
                register,
              }
              if (el.kind === 'garment') return <GarmentNode key={el.id} element={el} {...common} />
              if (el.kind === 'swatch')
                return (
                  <Rect
                    key={el.id}
                    ref={(n) => register(el.id, n)}
                    x={el.x * CW}
                    y={el.y * CH}
                    offsetX={(el.width * CW) / 2}
                    offsetY={(el.width * CW) / 2}
                    width={el.width * CW}
                    height={el.width * CW}
                    fill={el.color ?? '#2e4636'}
                    stroke="#f4efe3"
                    strokeWidth={4}
                    rotation={el.rotation}
                    visible={!el.hidden}
                    draggable={!el.locked}
                    onClick={() => editor.select(el.id)}
                    onTap={() => editor.select(el.id)}
                    onDragMove={onDragMove}
                    onDragEnd={(e) => {
                      clearGuides()
                      editor.patchElement(el.id, { x: e.target.x() / CW, y: e.target.y() / CH })
                    }}
                  />
                )
              if (el.kind === 'caption')
                return (
                  <Text
                    key={el.id}
                    ref={(n) => register(el.id, n)}
                    text={el.text ?? ''}
                    x={el.x * CW}
                    y={el.y * CH}
                    offsetX={(el.width * CW) / 2}
                    width={el.width * CW}
                    align="center"
                    fontFamily="Fraunces Variable, Georgia, serif"
                    fontSize={56}
                    fill="#26221b"
                    rotation={el.rotation}
                    visible={!el.hidden}
                    draggable={!el.locked}
                    onClick={() => editor.select(el.id)}
                    onTap={() => editor.select(el.id)}
                    onDragMove={onDragMove}
                    onDragEnd={(e) => {
                      clearGuides()
                      editor.patchElement(el.id, { x: e.target.x() / CW, y: e.target.y() / CH })
                    }}
                  />
                )
              return null
            })}
            {guides.x !== undefined && <Line points={[guides.x, 0, guides.x, CH]} stroke="#83621f" strokeWidth={1.5} dash={[8, 8]} />}
            {guides.y !== undefined && <Line points={[0, guides.y, CW, guides.y]} stroke="#83621f" strokeWidth={1.5} dash={[8, 8]} />}
            <Transformer ref={trRef} rotateEnabled keepRatio enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']} />
          </Layer>
        </Stage>
      </div>

      <div className={s.commandRow}>
        <Button onClick={() => editor.undo()} disabled={editor.past.length === 0}>
          Undo
        </Button>
        <Button onClick={() => editor.redo()} disabled={editor.future.length === 0}>
          Redo
        </Button>
        <Button onClick={addCaption}>+ Caption</Button>
        <Button variant="primary" onClick={exportBoard} loading={exporting}>
          Export PNG 2×
        </Button>
        <span className={s.zoomGroup}>
          <Button variant="quiet" onClick={() => editor.setZoom(editor.zoom - 0.25)} aria-label="Zoom out">
            −
          </Button>
          <span className={s.zoomLabel}>{Math.round(editor.zoom * 100)}%</span>
          <Button variant="quiet" onClick={() => editor.setZoom(editor.zoom + 0.25)} aria-label="Zoom in">
            +
          </Button>
        </span>
      </div>

      {selected && (
        <div className={s.selectedRow}>
          <span className={s.selectedKind}>{selected.kind}</span>
          {selected.kind === 'caption' && (
            <TextField label="Text" value={selected.text ?? ''} onChange={(e) => editor.patchElement(selected.id, { text: e.target.value })} />
          )}
          <Button onClick={() => editor.patchElement(selected.id, { locked: !selected.locked })}>
            {selected.locked ? 'Unlock' : 'Lock'}
          </Button>
          <Button onClick={() => editor.patchElement(selected.id, { hidden: !selected.hidden })}>
            {selected.hidden ? 'Show' : 'Hide'}
          </Button>
          <Button onClick={() => editor.patchElement(selected.id, { zIndex: selected.zIndex + 1 })}>Forward</Button>
          <Button onClick={() => editor.patchElement(selected.id, { zIndex: selected.zIndex - 1 })}>Back</Button>
          <Button
            variant="danger"
            onClick={() => {
              editor.apply(editor.elements.filter((e) => e.id !== selected.id))
              editor.select(null)
            }}
          >
            Delete
          </Button>
        </div>
      )}

      <h3>Add garments</h3>
      <div className={s.tray}>
        {(items.data ?? [])
          .filter((i) => i.ownershipStatus !== 'archived')
          .map((item) => (
            <button key={item.id} type="button" className={s.trayBtn} onClick={() => addGarment(item.id)}>
              {item.name}
            </button>
          ))}
      </div>
      {palette.length > 0 && (
        <>
          <h3>Add a swatch</h3>
          <div className={s.tray}>
            {palette.map((hex) => (
              <button
                key={hex}
                type="button"
                className={s.swatchBtn}
                style={{ background: hex }}
                aria-label={`Add swatch ${hex}`}
                onClick={() => addSwatch(hex)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
