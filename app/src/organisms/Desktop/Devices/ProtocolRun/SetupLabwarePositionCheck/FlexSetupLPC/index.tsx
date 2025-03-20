import { DIRECTION_COLUMN, Flex, SPACING } from '@opentrons/components'
import { useProtocolQuery } from '@opentrons/react-api-client'
import { css } from 'styled-components'

import { useNotifyRunQuery } from '/app/resources/runs'
import { LPCFlows } from '/app/organisms/LabwarePositionCheck'
import { LPCSetupFlexBtns } from './LPCSetupFlexBtns'
import { LPCSetupOffsetsTable } from './LPCSetupOffsetsTable'

import type { SetupLabwarePositionCheckProps } from '..'

// TOME TODO: The state updates don't seem to work if offsets are applied for some reason.
//  Is there any way to sync that info? I guess it's not terrible if you can't, but
//  applying offsets once to a run per app seems wise.

export function FlexSetupLPC(
  props: SetupLabwarePositionCheckProps
): JSX.Element {
  const { launchLPC, showLPC, lpcProps } = props.lpcUtils

  return (
    <Flex css={CONTAINER_STYLE}>
      <LPCSetupOffsetsTable {...props} />
      <LPCSetupFlexBtns {...props} launchLPC={launchLPC} />
      {showLPC && <LPCFlows {...lpcProps} />}
    </Flex>
  )
}

const CONTAINER_STYLE = css`
  flex-direction: ${DIRECTION_COLUMN};
  margin-top: ${SPACING.spacing16};
  grid-gap: ${SPACING.spacing16};
`
