import type { LoadedLabware } from '@opentrons/shared-data'
import type { LoadedLabwares } from './types'

export function getLoadedLabware(
  loadedLabware: LoadedLabwares,
  labwareId: string
): LoadedLabware | undefined {
  // NOTE: old analysis contains a object dictionary of labware entities by id, this case is supported for backwards compatibility purposes
  return Array.isArray(loadedLabware)
    ? loadedLabware.find(l => l.id === labwareId)
    : loadedLabware[labwareId]
}
