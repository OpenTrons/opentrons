import { POST, request } from '../request'

import type { ResponsePromise } from '../request'
import type { HostConfig } from '../types'
import type { LabwareDefinitionSummary } from './types'
import type {
  LabwareDefinition2,
  LabwareDefinition3,
} from '@opentrons/shared-data'

export function createMaintenanceRunLabwareDefinition(
  config: HostConfig,
  maintenanceRunId: string,
  data: LabwareDefinition2 | LabwareDefinition3
): ResponsePromise<LabwareDefinitionSummary> {
  return request<
    LabwareDefinitionSummary,
    { data: LabwareDefinition2 | LabwareDefinition3 }
  >(
    POST,
    `/maintenance_runs/${maintenanceRunId}/labware_definitions`,
    { data },
    config
  )
}
