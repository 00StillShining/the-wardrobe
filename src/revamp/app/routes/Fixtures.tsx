import { useState } from 'react'
import { Archive, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import s from './Fixtures.module.css'
import {
  Button,
  Checkbox,
  ConfirmDialog,
  Dialog,
  EmptyState,
  IconButton,
  InlineError,
  Menu,
  Segmented,
  SelectField,
  Sheet,
  Skeleton,
  Switch,
  Tabs,
  TextField,
  useToast,
} from '../../shared/ui'

const SWATCHES = [
  ['--oak', 'Oak'],
  ['--ebonized', 'Ebonized'],
  ['--linen', 'Linen'],
  ['--linen-raised', 'Linen raised'],
  ['--brass', 'Brass'],
  ['--bottle', 'Bottle'],
  ['--oxblood', 'Oxblood'],
  ['--room', 'Room'],
] as const

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={s.section}>
      <h2 className={s.sectionTitle}>{title}</h2>
      {children}
    </section>
  )
}

export function FixturesPage() {
  const toast = useToast()
  const [view, setView] = useState<'grid' | 'rail' | 'list'>('grid')
  const [tab, setTab] = useState('a')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)

  return (
    <div className={s.page}>
      <header className={s.head}>
        <h1>Design-system fixtures</h1>
        <p>Every control in every state. Phase 1 gate surface — not part of the product.</p>
      </header>

      <Section title="Materials">
        <div className={s.swatches}>
          {SWATCHES.map(([token, label]) => (
            <div key={token} className={s.swatch}>
              <span className={s.chip} style={{ background: `var(${token})` }} />
              <span className={s.chipLabel}>{label}</span>
              <code className={s.chipToken}>{token}</code>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Type scale">
        <p className={s.serifXL}>Fraunces carries titles and editorial captions.</p>
        <p className={s.bodySample}>
          Inter carries everything operational — body, forms, metadata, tables. Normal case, zero
          tracking, sixteen pixels on mobile and never below fourteen in dense desktop controls.
        </p>
        <p className={s.metaSample}>Metadata runs at twelve pixels, muted, and still passes AA.</p>
      </Section>

      <Section title="Buttons">
        <div className={s.row}>
          <Button variant="primary">Save garment</Button>
          <Button variant="ghost">Cancel</Button>
          <Button variant="quiet">Skip</Button>
          <Button variant="danger">Delete</Button>
        </div>
        <div className={s.row}>
          <Button variant="primary" loading>
            Saving
          </Button>
          <Button variant="ghost" disabled>
            Disabled
          </Button>
          <Button variant="primary" touch>
            Touch height
          </Button>
          <IconButton label="Edit">
            <Pencil />
          </IconButton>
          <IconButton label="Archive">
            <Archive />
          </IconButton>
          <IconButton label="Search" disabled>
            <Search />
          </IconButton>
        </div>
      </Section>

      <Section title="Fields">
        <div className={s.fieldGrid}>
          <TextField label="Name" placeholder="Camel coat" />
          <TextField label="Brand" defaultValue="Maison Vert" hint="As printed on the label." />
          <TextField label="Price paid" defaultValue="not a number" error="Enter an amount, like 240.00." />
          <TextField label="Size" placeholder="—" disabled />
          <SelectField label="Category" defaultValue="outerwear">
            <option value="outerwear">Outerwear</option>
            <option value="knitwear">Knitwear</option>
            <option value="trousers">Trousers</option>
          </SelectField>
          <SelectField label="Season" error="Pick at least one season.">
            <option>—</option>
          </SelectField>
          <SelectField label="Occasion" disabled>
            <option>Unavailable</option>
          </SelectField>
        </div>
      </Section>

      <Section title="Choices">
        <div className={s.row}>
          <Checkbox label="Owned" defaultChecked />
          <Checkbox label="Wishlist" />
          <Checkbox label="Archived" disabled />
        </div>
        <div className={s.row}>
          <Switch label="Reduced motion" defaultChecked />
          <Switch label="High quality 3D" />
          <Switch label="Unavailable" disabled />
        </div>
        <div className={s.row}>
          <Segmented
            label="View"
            value={view}
            onChange={setView}
            options={[
              { value: 'grid', label: 'Grid' },
              { value: 'rail', label: 'Rail' },
              { value: 'list', label: 'List' },
            ]}
          />
          <Segmented
            label="View (disabled)"
            value="grid"
            onChange={() => {}}
            disabled
            options={[
              { value: 'grid', label: 'Grid' },
              { value: 'list', label: 'List' },
            ]}
          />
          <Menu
            trigger="Sort · Newest"
            items={[
              { label: 'Newest', onSelect: () => toast('Sorted by newest') },
              { label: 'Name', onSelect: () => toast('Sorted by name') },
              { label: 'Unavailable', onSelect: () => {}, disabled: true },
              { label: 'Reset filters', onSelect: () => toast('Filters reset'), danger: true },
            ]}
          />
        </div>
      </Section>

      <Section title="Tabs">
        <Tabs
          label="Example sections"
          active={tab}
          onChange={setTab}
          tabs={[
            { id: 'a', label: 'Details', content: <p className={s.bodySample}>Tab panels hold real content, not cards.</p> },
            { id: 'b', label: 'Wear history', content: <p className={s.bodySample}>Arrow keys move between tabs.</p> },
            { id: 'c', label: 'Source', content: <p className={s.bodySample}>Focus is managed on the active tab.</p> },
          ]}
        />
      </Section>

      <Section title="Overlays">
        <div className={s.row}>
          <Button onClick={() => setDialogOpen(true)}>Open dialog</Button>
          <Button onClick={() => setConfirmOpen(true)} variant="danger">
            Delete with confirm
          </Button>
          <Button onClick={() => setSheetOpen(true)}>Open sheet</Button>
          <Button onClick={() => toast('Garment saved to Collection', { tone: 'success' })}>
            Success toast
          </Button>
          <Button onClick={() => toast('Processing failed — retry from Import.', { tone: 'danger', duration: 8000 })}>
            Failure toast
          </Button>
        </div>
        <Dialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          title="Edit garment"
          actions={
            <>
              <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={() => setDialogOpen(false)}>
                Save
              </Button>
            </>
          }
        >
          <TextField label="Name" defaultValue="Striped wool knit" />
          <SelectField label="Category" defaultValue="knitwear">
            <option value="knitwear">Knitwear</option>
            <option value="outerwear">Outerwear</option>
          </SelectField>
        </Dialog>
        <ConfirmDialog
          open={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          onConfirm={() => toast('Deleted — this demo forgives.', { tone: 'danger' })}
          title="Delete this garment?"
          body="It is used by 2 outfits and 1 style board. Those references will be removed. This cannot be undone."
          confirmLabel="Delete garment"
          danger
        />
        <Sheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          title="Filter collection"
          actions={
            <Button variant="primary" onClick={() => setSheetOpen(false)}>
              Apply
            </Button>
          }
        >
          <SelectField label="Category" defaultValue="all">
            <option value="all">All</option>
            <option value="knitwear">Knitwear</option>
          </SelectField>
          <Checkbox label="Owned only" defaultChecked />
          <Switch label="Include archived" />
        </Sheet>
      </Section>

      <Section title="States">
        <div className={s.row}>
          <div className={s.tile}>
            <Skeleton height={120} radius="m" />
            <Skeleton height="0.8rem" width="70%" radius="s" />
            <Skeleton height="0.7rem" width="45%" radius="s" />
          </div>
          <div className={s.stateCol}>
            <InlineError>Background removal failed. Retry, replace the image, or keep the original.</InlineError>
          </div>
        </div>
        <EmptyState
          figure={<Plus aria-hidden />}
          title="No garments yet"
          hint="Add your first piece with a photo — the cutout is prepared automatically."
          action={<Button variant="primary">Add first item</Button>}
        />
      </Section>

      <Section title="Dark chrome context">
        <div className={s.darkPanel} data-surface="dark">
          <p className={s.darkTitle}>Semantic tokens flip with the surface.</p>
          <div className={s.row}>
            <Button variant="primary">Primary on dark</Button>
            <Button variant="ghost">Ghost on dark</Button>
            <Button variant="danger">Danger on dark</Button>
            <IconButton label="Delete">
              <Trash2 />
            </IconButton>
          </div>
          <div className={s.row}>
            <TextField label="Search the archive" placeholder="Try “camel coat”" />
          </div>
        </div>
      </Section>
    </div>
  )
}
