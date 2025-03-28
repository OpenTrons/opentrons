import { getLoadedModule } from './getLoadedModule'
import type { ModuleModel } from '@opentrons/shared-data'
import type { LoadedModules } from './types'

export function getModuleModel(
  loadedModules: LoadedModules,
  moduleId: string
): ModuleModel | null {
  const loadedModule = getLoadedModule(loadedModules, moduleId)
  return loadedModule != null ? loadedModule.model : null
}
