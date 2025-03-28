import { getLoadedModule } from '@opentrons/components'

import type { RunData } from '@opentrons/api-client'
import type { ModuleModel } from '@opentrons/shared-data'

export function getModuleModelFromRunData(
  protocolData: RunData,
  moduleId: string
): ModuleModel | null {
  const loadedModule = getLoadedModule(protocolData.modules, moduleId)
  return loadedModule != null ? loadedModule.model : null
}
