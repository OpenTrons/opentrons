import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import { css } from 'styled-components'

import {
  Flex,
  StyledText,
  SPACING,
  getLabwareDisplayLocation,
  DIRECTION_COLUMN,
  ListTable,
} from '@opentrons/components'
import { FLEX_ROBOT_TYPE } from '@opentrons/shared-data'

import { selectSelectedLwLocationSpecificOffsetDetails } from '/app/redux/protocol-runs'
import { LabwareLocationItem } from '/app/organisms/LabwarePositionCheck/steps/HandleLabware/LPCLabwareDetails/AppliedLocationOffsetsContainer/LabwareLocationItem'

import type { State } from '/app/redux/types'
import type { LPCWizardContentProps } from '/app/organisms/LabwarePositionCheck/types'
import type { LPCWizardState } from '/app/redux/protocol-runs'
import { OffsetTableHeaders } from '/app/organisms/LabwarePositionCheck/steps/HandleLabware/LPCLabwareDetails/AppliedLocationOffsetsContainer/OffsetTableHeaders'

export function AppliedLocationOffsetsContainer(
  props: LPCWizardContentProps
): JSX.Element {
  const { t } = useTranslation('labware_position_check')
  const { t: commandTextT } = useTranslation('protocol_command_text')

  const locationSpecificOffsetDetails = useSelector(
    selectSelectedLwLocationSpecificOffsetDetails(props.runId)
  )
  const { protocolData } = useSelector(
    (state: State) => state.protocolRuns[props.runId]?.lpc as LPCWizardState
  )

  const detailsWithSlotCopy = locationSpecificOffsetDetails.map(offset => {
    const slotCopy = getLabwareDisplayLocation({
      t: commandTextT,
      loadedModules: protocolData.modules,
      loadedLabwares: protocolData.labware,
      robotType: FLEX_ROBOT_TYPE,
      location: {
        slotName: offset.locationDetails.slotName,
      },
      detailLevel: 'slot-only',
    }).slice(-2) // ex, "C1" instead of "Slot C1"

    return {
      ...offset,
      slotCopy,
    }
  })

  // Sort the array alphanumerically by slotCopy
  const sortedDetailsBySlot = [...detailsWithSlotCopy].sort((a, b) =>
    a.slotCopy.localeCompare(b.slotCopy, 'en', {
      numeric: true,
    })
  )

  return (
    <Flex css={APPLIED_LOCATION_CONTAINER_STYLE}>
      <StyledText oddStyle="level4HeaderSemiBold">
        {t('applied_location_offsets')}
      </StyledText>
      <Flex flexDirection={DIRECTION_COLUMN}>
        <OffsetTableHeaders />
        <ListTable>
          {sortedDetailsBySlot.map(offset => (
            <LabwareLocationItem
              key={`${offset.locationDetails.slotName}${offset.locationDetails.moduleId}${offset.locationDetails.adapterId}`}
              {...props}
              locationSpecificOffsetDetails={offset}
              slotCopy={offset.slotCopy}
            />
          ))}
        </ListTable>
      </Flex>
    </Flex>
  )
}

const APPLIED_LOCATION_CONTAINER_STYLE = css`
  flex-direction: ${DIRECTION_COLUMN};
  grid-gap: ${SPACING.spacing24};
`
