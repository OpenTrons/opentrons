import { getLoadedModule } from './getLoadedModule'
import type { LoadedModules } from './types'

export function getModuleDisplayLocation(
  loadedModules: LoadedModules,
  moduleId: string
): string {
  const loadedModule = getLoadedModule(loadedModules, moduleId)
  return loadedModule != null ? loadedModule.location.slotName : ''
}
