import { DIRECTION_COLUMN, Flex, SPACING } from '@opentrons/components'
import { useProtocolQuery } from '@opentrons/react-api-client'
import { css } from 'styled-components'

import { useLaunchLegacyLPC } from '/app/organisms/LegacyLabwarePositionCheck/useLaunchLegacyLPC'
import { useNotifyRunQuery } from '/app/resources/runs'
import { useRobotType } from '/app/redux-resources/robots'
import { useLPCFlows, LPCFlows } from '/app/organisms/LabwarePositionCheck'
import { LPCSetupFlexBtns } from './LPCSetupFlexBtns'
import { LPCSetupOffsetsTable } from './LPCSetupOffsetsTable'

import type { SetupLabwarePositionCheckProps } from '..'

// TOME TODO: The state updates don't seem to work if offsets are applied for some reason.
//  Is there any way to sync that info? I guess it's not terrible if you can't, but
//  applying offsets once to a run per app seems wise.

export function FlexSetupLPC(
  props: SetupLabwarePositionCheckProps
): JSX.Element {
  const { robotName, runId, isNewLPC } = props
  const robotType = useRobotType(robotName)
  const { data: runRecord } = useNotifyRunQuery(runId, { staleTime: Infinity })
  const { data: protocolRecord } = useProtocolQuery(
    runRecord?.data.protocolId ?? null,
    {
      staleTime: Infinity,
    }
  )
  const protocolName =
    protocolRecord?.data.metadata.protocolName ??
    protocolRecord?.data.files[0].name ??
    ''

  const { launchLegacyLPC, LegacyLPCWizard } = useLaunchLegacyLPC(
    runId,
    robotType,
    protocolName
  )
  const { launchLPC, lpcProps, showLPC } = useLPCFlows({
    runId,
    robotType,
    protocolName,
  })

  return (
    <Flex css={CONTAINER_STYLE}>
      <LPCSetupOffsetsTable {...props} />
      <LPCSetupFlexBtns
        {...props}
        launchLPC={launchLPC}
        launchLegacyLPC={launchLegacyLPC}
      />
      {isNewLPC ? null : LegacyLPCWizard}
      {showLPC && <LPCFlows {...lpcProps} />}
    </Flex>
  )
}

const CONTAINER_STYLE = css`
  flex-direction: ${DIRECTION_COLUMN};
  margin-top: ${SPACING.spacing16};
  grid-gap: ${SPACING.spacing16};
`
