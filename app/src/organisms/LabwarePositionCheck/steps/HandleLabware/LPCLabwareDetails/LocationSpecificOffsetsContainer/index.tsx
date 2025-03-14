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
  RESPONSIVENESS,
} from '@opentrons/components'
import { FLEX_ROBOT_TYPE } from '@opentrons/shared-data'

import { selectSelectedLwLocationSpecificOffsetDetails } from '/app/redux/protocol-runs'
import { LabwareLocationItem } from './LabwareLocationItem'
import { OffsetTableHeaders } from './OffsetTableHeaders'

import type { State } from '/app/redux/types'
import type { LPCWizardContentProps } from '/app/organisms/LabwarePositionCheck/types'
import type { LPCWizardState } from '/app/redux/protocol-runs'

export function LocationSpecificOffsetsContainer(
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
    <Flex css={LOCATION_SPECIFIC_CONTAINER_STYLE}>
      <StyledText
        oddStyle="level4HeaderSemiBold"
        desktopStyle="bodyLargeSemiBold"
      >
        {t('applied_location_offsets')}
      </StyledText>
      <Flex flexDirection={DIRECTION_COLUMN}>
        <OffsetTableHeaders />
        <ListTable>
          {sortedDetailsBySlot.map(offset => {
            const { slotCopy, ...details } = offset

            return (
              <LabwareLocationItem
                key={`${offset.locationDetails.slotName}${offset.locationDetails.moduleId}${offset.locationDetails.adapterId}`}
                {...props}
                locationSpecificOffsetDetails={details}
                slotCopy={slotCopy}
              />
            )
          })}
        </ListTable>
      </Flex>
    </Flex>
  )
}

const LOCATION_SPECIFIC_CONTAINER_STYLE = css`
  flex-direction: ${DIRECTION_COLUMN};
  gap: ${SPACING.spacing16};

  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    grid-gap: ${SPACING.spacing24};
  }
`
