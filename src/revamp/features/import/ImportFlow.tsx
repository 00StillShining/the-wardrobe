import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Camera, Image as ImageIcon } from 'lucide-react'
import s from './ImportFlow.module.css'
import { Button, InlineError, SelectField, TextField, useToast } from '../../shared/ui'
import { useBackend } from '../../app/backend'
import { canvasImageProcessor, processingVersion } from '../../services/processing/canvasProcessor'
import type { ImportJob } from '../../data/types'
import type { ProcessedImages } from '../../services/contracts'

/**
 * The §9.5 flow: choose/capture → validate → upload original → durable job →
 * process → review (cutout vs keep-original) → details → idempotent save.
 * Every stage transition is persisted on the job, so reload/navigation can
 * resume from the stored original instead of corrupting the run.
 */

const ACCEPT = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 15 * 1024 * 1024

const CATEGORIES = ['outerwear', 'knitwear', 'tops', 'trousers', 'skirts', 'dresses', 'shoes', 'accessories'] as const
const LAYER_FOR: Record<string, string> = {
  outerwear: 'coat',
  knitwear: 'knit',
  tops: 'tee',
  trousers: 'bottom',
  skirts: 'bottom',
  dresses: 'dress',
  shoes: 'shoes',
  accessories: 'accessory',
}

type Stage =
  | { kind: 'choose' }
  | { kind: 'working'; label: string; progress?: number }
  | { kind: 'review'; job: ImportJob; original: Blob; processed: ProcessedImages; useOriginal: boolean }
  | { kind: 'details'; job: ImportJob; original: Blob; processed: ProcessedImages; useOriginal: boolean }
  | { kind: 'failed'; job: ImportJob | null; message: string; original: Blob | null }

function extFor(type: string): string {
  return type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg'
}

export function ImportFlow() {
  const backend = useBackend()
  const toast = useToast()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [stage, setStage] = useState<Stage>({ kind: 'choose' })
  const [activeJobs, setActiveJobs] = useState<ImportJob[]>([])
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const captureRef = useRef<HTMLInputElement>(null)

  const refreshActive = useCallback(() => {
    backend.importJobs.listActive().then(setActiveJobs, () => setActiveJobs([]))
  }, [backend])

  useEffect(refreshActive, [refreshActive])

  async function processInto(job: ImportJob, original: Blob) {
    setStage({ kind: 'working', label: 'Preparing the cutout' })
    await backend.importJobs.updateStatus(job.id, { status: 'processing', progress: 60 })
    try {
      const processed = await canvasImageProcessor.process(original)
      const fresh = await backend.importJobs.updateStatus(job.id, { status: 'review', progress: 80 })
      setStage({
        kind: 'review',
        job: fresh,
        original,
        processed,
        useOriginal: (processed.keyConfidence ?? 0) < 0.35,
      })
    } catch (e) {
      await backend.importJobs.updateStatus(job.id, {
        status: 'failed',
        errorCode: 'processing_failed',
      })
      setStage({
        kind: 'failed',
        job,
        original,
        message: e instanceof Error ? e.message : 'Background removal failed.',
      })
    }
  }

  async function beginWithFile(file: File) {
    setError(null)
    if (!ACCEPT.includes(file.type)) {
      setError('Use a JPEG, PNG or WebP photo.')
      return
    }
    if (file.size > MAX_BYTES) {
      setError('Photos up to 15 MB are supported. Pick a smaller file.')
      return
    }
    setStage({ kind: 'working', label: 'Uploading the photo', progress: 10 })
    try {
      const job = await backend.importJobs.createIdempotent({
        idempotencyKey: crypto.randomUUID(),
        sourceType: 'manual',
      })
      const path = await backend.media.upload({
        bucket: 'originals',
        key: `imports/${job.id}/original.${extFor(file.type)}`,
        blob: file,
        contentType: file.type,
        upsert: true,
      })
      await backend.importJobs.updateStatus(job.id, { status: 'uploading', progress: 30, originalPath: path })
      await processInto(job, file)
      refreshActive()
    } catch (e) {
      setStage({
        kind: 'failed',
        job: null,
        original: file,
        message: e instanceof Error ? e.message : 'Upload failed. Check the connection and retry.',
      })
    }
  }

  async function resume(job: ImportJob) {
    if (!job.originalPath) {
      await cancel(job)
      return
    }
    setStage({ kind: 'working', label: 'Reloading your photo' })
    try {
      const url = await backend.media.getObjectUrl('originals', job.originalPath)
      const original = await (await fetch(url)).blob()
      await processInto(job, original)
    } catch {
      setStage({ kind: 'failed', job, original: null, message: 'The stored photo could not be reloaded.' })
    }
  }

  async function cancel(job: ImportJob) {
    await backend.importJobs.updateStatus(job.id, { status: 'cancelled' })
    if (job.originalPath) {
      await backend.media.delete('originals', job.originalPath).catch(() => {})
    }
    refreshActive()
    setStage({ kind: 'choose' })
  }

  async function save(details: { name: string; brand: string; category: string; owned: boolean }, st: Stage) {
    if (st.kind !== 'details') return
    const { job, original, processed, useOriginal } = st
    setStage({ kind: 'working', label: 'Saving to your collection', progress: 90 })
    try {
      await backend.importJobs.updateStatus(job.id, { status: 'saving' })
      // idempotent save: a retry reuses the item recorded on the job
      let itemId = (job.resultPayload as { itemId?: string } | null)?.itemId
      if (!itemId) {
        const item = await backend.wardrobe.create({
          name: details.name,
          brand: details.brand || undefined,
          category: details.category,
          layerType: LAYER_FOR[details.category] ?? 'tee',
          ownershipStatus: details.owned ? 'owned' : 'wishlist',
          palette: processed.palette,
          primaryColor: processed.palette[0] ?? null,
          sourceType: 'manual',
        })
        itemId = item.id
        job.resultPayload = { itemId }
        await backend.importJobs.updateStatus(job.id, { resultPayload: { itemId }, resultSchemaVersion: 1 })
      }
      const put = async (kind: 'cutout' | 'display' | 'thumbnail', blob: Blob, mime: string) => {
        const path = await backend.media.upload({
          bucket: 'derivatives',
          key: `items/${itemId}/${kind}.${mime === 'image/png' ? 'png' : 'webp'}`,
          blob,
          contentType: mime,
          upsert: true,
        })
        await backend.itemImages.create({
          itemId: itemId!,
          kind,
          storagePath: path,
          mimeType: mime,
          width: processed.width,
          height: processed.height,
          bytes: blob.size,
          processingVersion,
          status: 'ready',
        })
      }
      if (job.originalPath) {
        await backend.itemImages.create({
          itemId,
          kind: 'original',
          storagePath: job.originalPath,
          mimeType: original.type || 'image/jpeg',
          bytes: original.size,
          processingVersion,
          status: 'ready',
        })
      }
      if (useOriginal) {
        // honest fallback: the original stands in for display until
        // reprocessed — no derivative of the rejected cutout is kept
        await put('display', original, original.type || 'image/jpeg')
      } else {
        await put('cutout', processed.cutout, 'image/png')
        await put('display', processed.display, 'image/webp')
        await put('thumbnail', processed.thumb, 'image/webp')
      }
      await backend.importJobs.updateStatus(job.id, { status: 'complete', progress: 100 })
      await queryClient.invalidateQueries({ queryKey: ['wardrobe'] })
      toast('Saved to Collection', { tone: 'success' })
      navigate(`/app/collection/${itemId}`)
    } catch (e) {
      setStage({
        kind: 'failed',
        job,
        original,
        message: e instanceof Error ? e.message : 'Saving failed — retrying is safe.',
      })
    }
  }

  // —— render ——

  if (stage.kind === 'working') {
    return (
      <div className={s.center} role="status">
        <span className={s.spinner} aria-hidden />
        <p>{stage.label}…</p>
        <p className={s.note}>You can leave this page — the job is saved and resumable.</p>
      </div>
    )
  }

  if (stage.kind === 'review') {
    const lowConfidence = (stage.processed.keyConfidence ?? 0) < 0.35
    return (
      <ReviewStep
        stage={stage}
        lowConfidence={lowConfidence}
        onRetry={() => processInto(stage.job, stage.original)}
        onCancel={() => cancel(stage.job)}
        onContinue={(useOriginal) => setStage({ ...stage, kind: 'details', useOriginal })}
      />
    )
  }

  if (stage.kind === 'details') {
    return <DetailsStep onBack={() => setStage({ ...stage, kind: 'review' })} onSave={(d) => save(d, stage)} />
  }

  if (stage.kind === 'failed') {
    return (
      <div className={s.center}>
        <InlineError>{stage.message}</InlineError>
        <div className={s.row}>
          {stage.job && stage.original && (
            <Button variant="primary" onClick={() => processInto(stage.job!, stage.original!)}>
              Retry
            </Button>
          )}
          <Button onClick={() => setStage({ kind: 'choose' })}>Choose another photo</Button>
          {stage.job && <Button variant="quiet" onClick={() => cancel(stage.job!)}>Cancel job</Button>}
        </div>
      </div>
    )
  }

  return (
    <div className={s.choose}>
      {activeJobs.length > 0 && (
        <div className={s.resumeBlock}>
          <h3>Unfinished import</h3>
          {activeJobs.map((j) => (
            <div key={j.id} className={s.resumeRow}>
              <span className={s.note}>
                Started {new Date(j.createdAt).toLocaleTimeString()} · {j.status}
              </span>
              <Button onClick={() => resume(j)}>Resume</Button>
              <Button variant="quiet" onClick={() => cancel(j)}>
                Discard
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className={s.optionRow}>
        <ImageIcon aria-hidden />
        <div className={s.optionText}>
          <h3>Choose a photo</h3>
          <p>JPEG, PNG or WebP up to 15 MB. The background is removed automatically for review.</p>
        </div>
        <Button variant="primary" onClick={() => fileRef.current?.click()}>
          Choose photo
        </Button>
      </div>
      <div className={s.optionRow}>
        <Camera aria-hidden />
        <div className={s.optionText}>
          <h3>Capture</h3>
          <p>Use the camera on supported mobile devices.</p>
        </div>
        <Button onClick={() => captureRef.current?.click()}>Open camera</Button>
      </div>
      {error && <InlineError>{error}</InlineError>}

      <input
        ref={fileRef}
        className={s.hiddenInput}
        type="file"
        accept={ACCEPT.join(',')}
        aria-label="Choose a garment photo"
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (f) beginWithFile(f)
        }}
      />
      <input
        ref={captureRef}
        className={s.hiddenInput}
        type="file"
        accept={ACCEPT.join(',')}
        capture="environment"
        aria-label="Capture a garment photo"
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (f) beginWithFile(f)
        }}
      />
    </div>
  )
}

function ReviewStep({
  stage,
  lowConfidence,
  onRetry,
  onCancel,
  onContinue,
}: {
  stage: Extract<Stage, { kind: 'review' }>
  lowConfidence: boolean
  onRetry: () => void
  onCancel: () => void
  onContinue: (useOriginal: boolean) => void
}) {
  const [useOriginal, setUseOriginal] = useState(stage.useOriginal)
  // create + revoke inside the effect so StrictMode's simulated unmount
  // can't leave revoked URLs behind
  const [originalUrl, setOriginalUrl] = useState<string>()
  const [cutoutUrl, setCutoutUrl] = useState<string>()
  useEffect(() => {
    const o = URL.createObjectURL(stage.original)
    const c = URL.createObjectURL(stage.processed.cutout)
    setOriginalUrl(o)
    setCutoutUrl(c)
    return () => {
      URL.revokeObjectURL(o)
      URL.revokeObjectURL(c)
    }
  }, [stage.original, stage.processed.cutout])
  return (
    <div className={s.review}>
      <h3>Review the cutout</h3>
      {lowConfidence && (
        <InlineError>
          The background could not be isolated confidently. You can keep the original photo instead
          — nothing fake is saved.
        </InlineError>
      )}
      <div className={s.compare}>
        <figure className={s.compareCell} data-selected={useOriginal || undefined}>
          <img src={originalUrl} alt="Original photo" />
          <figcaption>
            <Button variant={useOriginal ? 'primary' : 'ghost'} onClick={() => setUseOriginal(true)}>
              Keep original
            </Button>
          </figcaption>
        </figure>
        <figure className={s.compareCell} data-selected={!useOriginal || undefined}>
          <img src={cutoutUrl} alt="Automatic cutout" className={s.checker} />
          <figcaption>
            <Button variant={!useOriginal ? 'primary' : 'ghost'} onClick={() => setUseOriginal(false)}>
              Use cutout
            </Button>
          </figcaption>
        </figure>
      </div>
      <div className={s.row}>
        <Button variant="primary" onClick={() => onContinue(useOriginal)}>
          Continue
        </Button>
        <Button onClick={onRetry}>Reprocess</Button>
        <Button variant="quiet" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

function DetailsStep({
  onBack,
  onSave,
}: {
  onBack: () => void
  onSave: (d: { name: string; brand: string; category: string; owned: boolean }) => void
}) {
  const [name, setName] = useState('')
  const [brand, setBrand] = useState('')
  const [category, setCategory] = useState<string>('tops')
  const [owned, setOwned] = useState(true)
  const [error, setError] = useState<string | null>(null)
  return (
    <form
      className={s.details}
      onSubmit={(e) => {
        e.preventDefault()
        if (!name.trim()) {
          setError('Give the piece a name.')
          return
        }
        onSave({ name: name.trim(), brand: brand.trim(), category, owned })
      }}
    >
      <h3>Details</h3>
      <TextField label="Name" placeholder="Camel coat" value={name} onChange={(e) => setName(e.target.value)} />
      <TextField label="Brand" placeholder="Optional" value={brand} onChange={(e) => setBrand(e.target.value)} />
      <SelectField label="Category" value={category} onChange={(e) => setCategory(e.target.value)}>
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c[0].toUpperCase() + c.slice(1)}
          </option>
        ))}
      </SelectField>
      <SelectField label="Ownership" value={owned ? 'owned' : 'wishlist'} onChange={(e) => setOwned(e.target.value === 'owned')}>
        <option value="owned">Owned</option>
        <option value="wishlist">Wishlist</option>
      </SelectField>
      {error && <InlineError>{error}</InlineError>}
      <div className={s.row}>
        <Button variant="primary" type="submit">
          Save to Collection
        </Button>
        <Button onClick={onBack}>Back</Button>
      </div>
    </form>
  )
}
