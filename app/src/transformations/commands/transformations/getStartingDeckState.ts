import { getLabwareDisplayName } from '@opentrons/shared-data'

import type {
  LabwareDefinition2,
  LabwareLocation,
  LoadModuleRunTimeCommand,
  ModuleLocation,
  ModuleModel,
  RunTimeCommand,
} from '@opentrons/shared-data'

export interface LabwareSetupItem {
  definition: LabwareDefinition2
  nickName: string | null
  initialLocation: LabwareLocation
  moduleModel: ModuleModel | null
  moduleLocation: ModuleLocation | null
  labwareId?: string
}

// load labware, load lid, load lid stack
// in reverse order
// last command to load something into a slot will be considered starting state

export interface LabwareItem {
  definition: LabwareDefinition2
  nickName: string | null
  labwareId?: string
  lidId?: string
  lidDefinition?: string
  hasLiquid: boolean
}

type StartingDeckItem = LoadedLabware | LoadedModule
// starting state could just be labware id, def + lid id, def (then expand this for flex stuff)
// or module id
// or addressable area name

// export function getLabwareSetupItemGroups(
//     commands: RunTimeCommand[]
//   ):  {

// }
