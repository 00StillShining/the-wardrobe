import {
  BarChart3,
  DoorClosed,
  Inbox,
  Layers,
  Palette,
  Shirt,
  type LucideIcon,
} from 'lucide-react'

export interface Destination {
  id: string
  path: string
  label: string
  /** Physical metaphor — scene flavor only, never required to complete a task */
  physical: string
  job: string
  icon: LucideIcon
}

/** The five product destinations plus overview (plan §4.2). */
export const DESTINATIONS: Destination[] = [
  {
    id: 'overview',
    path: '/app',
    label: 'Overview',
    physical: 'The composed wardrobe',
    job: 'Orientation and the camera-led menu',
    icon: DoorClosed,
  },
  {
    id: 'collection',
    path: '/app/collection',
    label: 'Collection',
    physical: 'Rail, shelves and archive drawers',
    job: 'Search, browse, filter, edit and select garments',
    icon: Shirt,
  },
  {
    id: 'outfits',
    path: '/app/outfits',
    label: 'Outfit Studio',
    physical: 'Mirror and dress form',
    job: 'Assemble, save and revisit outfits',
    icon: Layers,
  },
  {
    id: 'style',
    path: '/app/style',
    label: 'Style Studio',
    physical: 'Linen pinboard',
    job: 'Create editorial boards and exports',
    icon: Palette,
  },
  {
    id: 'insights',
    path: '/app/insights',
    label: 'Insights',
    physical: 'Ledger drawer',
    job: 'Understand value, wear, gaps and purchases',
    icon: BarChart3,
  },
  {
    id: 'import',
    path: '/app/import',
    label: 'Add / Import',
    physical: 'Post tray and camera surface',
    job: 'Add photographs, URLs or supported receipts',
    icon: Inbox,
  },
]

/** Bottom-nav set for mobile: Collection first (daily default), Add central. */
export const MOBILE_NAV: Destination[] = [
  DESTINATIONS[1],
  DESTINATIONS[2],
  DESTINATIONS[5],
  DESTINATIONS[3],
  DESTINATIONS[4],
]
