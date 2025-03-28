import type { LoadedPipette, PipetteName } from '@opentrons/shared-data'
import type { LoadedPipettes } from './types'

export function getLoadedPipette(
  loadedPipettes: LoadedPipettes,
  mount: string
): LoadedPipette | undefined {
  // NOTE: old analysis contains a object dictionary of pipette entities by id, this case is supported for backwards compatibility purposes
  return Array.isArray(loadedPipettes)
    ? loadedPipettes.find(l => l.mount === mount)
    : loadedPipettes[mount]
}

export function getPipetteNameOnMount(
  loadedPipettes: LoadedPipettes,
  mount: string
): PipetteName | null {
  const loadedPipette = getLoadedPipette(loadedPipettes, mount)
  return loadedPipette != null ? loadedPipette.pipetteName : null
}
