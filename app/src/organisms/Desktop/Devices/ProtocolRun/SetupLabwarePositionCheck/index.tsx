import { FLEX_ROBOT_TYPE } from '@opentrons/shared-data'

import { OT2SetupLPC } from './OT2SetupLPC'
import { FlexSetupLPC } from './FlexSetupLPC'

import type { RobotType } from '@opentrons/shared-data'
import type { UseLPCFlowsResult } from '/app/organisms/LabwarePositionCheck'

export interface SetupLabwarePositionCheckProps {
  offsetsConfirmed: boolean
  setOffsetsConfirmed: (confirmed: boolean) => void
  robotName: string
  robotType: RobotType
  runId: string
  lpcUtils: UseLPCFlowsResult
}

export function SetupLabwarePositionCheck(
  props: SetupLabwarePositionCheckProps
): JSX.Element {
  return props.robotType === FLEX_ROBOT_TYPE ? (
    <FlexSetupLPC {...props} />
  ) : (
    <OT2SetupLPC {...props} />
  )
}
