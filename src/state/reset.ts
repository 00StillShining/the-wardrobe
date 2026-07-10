import { localStorageAdapter as storage } from '../adapters/storage/StorageAdapter'
import { useItems } from './items'
import { useSelection } from './selection'
import { useSheets } from './sheets'
import { useTryOn } from './tryOn'
import { usePreferences } from './preferences'

/** Remove all device-local wardrobe data, then rebuild the initial state. */
export async function resetWardrobe() {
  await storage.reset()
  useItems.setState({ items: [], ready: false, seeding: false, importing: new Set(), filter: 'all' })
  useSheets.setState({ sheets: [], draft: null, past: [], future: [] })
  useSelection.setState({ focused: null, selectMode: false, selected: new Set() })
  useTryOn.setState({ worn: [] })
  usePreferences.getState().reset()
  await useItems.getState().init()
  useSheets.getState().init()
  usePreferences.getState().init()
}
