import { PipetteName } from '../../../js'
import type { V6Command } from './command'
import type { LabwareDefinition2, ModuleModel } from '../../../js/types'

// NOTE: must be kept in sync with '../schemas/6.json'
export interface ProtocolFile<DesignerApplicationData> {
  $otSharedSchema: '#/protocol/schemas/6'
  schemaVersion: 6
  metadata: {
    protocolName?: string
    author?: string
    description?: string | null | undefined
    created?: number
    lastModified?: number | null | undefined
    category?: string | null | undefined
    subcategory?: string | null | undefined
    tags?: string[]
  }
  designerApplication?: {
    name?: string
    version?: string
    data?: DesignerApplicationData
  }
  robot: {
    model: 'OT-2 Standard' | 'OT-3 Standard'
    deckId: 'ot2_standard' | 'ot2_short_trash'
  }
  pipettes: {
    [pipetteId: string]: { name: PipetteName }
  }
  labwareDefinitions: {
    [definitionId: string]: LabwareDefinition2
  }
  labware: {
    [labwareId: string]: {
      definitionId: string
      displayName?: string
    }
  }
  modules: {
    [moduleId: string]: {
      model: ModuleModel
    }
  }
  commands: V6Command[]
  commandAnnotations?: Record<string, any> // NOTE: intentionally underspecified b/c we haven't decided on this yet
}
