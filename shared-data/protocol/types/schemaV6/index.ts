import { PipetteName } from '../../../js'
import type { CreateCommand, RunTimeCommand } from './command'
import type { LabwareDefinition2, ModuleModel } from '../../../js/types'

export * from './command'

// NOTE: must be kept in sync with '../schemas/6.json'
export interface ProtocolFile<DesignerApplicationData = {}> {
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
  liquids: {
    [liquidId: string]: {
      displayName: string
      description: string
    }
  }
  commands: CreateCommand[]
  commandAnnotations?: {
    commandIds: string[]
    annotationType: string
    params?: { [key: string]: any }
  }
}

/**
 * This type should not be used, any time you need want a function/hook/component to take in
 * a protocol file with run time commands, split your function signature to take in each param
 * separately, and import the RunTimeCommand type separately. RunTimeCommand is a server concept
 * and should not be mixed with our Protocol
 * @deprecated Use {@link ProtocolFile}
 */
export interface ProtocolAnalysisFile<DesignerApplicationData = {}>
  extends Omit<ProtocolFile<DesignerApplicationData>, 'commands'> {
  commands: RunTimeCommand[]
}
