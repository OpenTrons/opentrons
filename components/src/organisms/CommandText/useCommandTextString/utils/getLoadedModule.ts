import type { LoadedModule } from '@opentrons/shared-data'
import type { LoadedModules } from './types'

export function getLoadedModule(
  loadedModules: LoadedModules,
  moduleId: string
): LoadedModule | undefined {
  // NOTE: old analysis contains a object dictionary of module entities by id, this case is supported for backwards compatibility purposes
  return Array.isArray(loadedModules)
    ? loadedModules.find(l => l.id === moduleId)
    : loadedModules[moduleId]
}
