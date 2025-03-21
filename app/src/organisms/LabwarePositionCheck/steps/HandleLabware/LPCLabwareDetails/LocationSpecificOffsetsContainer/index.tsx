import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import { css } from 'styled-components'

import {
  Flex,
  StyledText,
  SPACING,
  DIRECTION_COLUMN,
  ListTable,
  RESPONSIVENESS,
} from '@opentrons/components'

import {
  selectSelectedLwOverview,
  selectSortedLSOffsetDetailsWithCopy,
} from '/app/redux/protocol-runs'
import { LabwareLocationItem } from './LabwareLocationItem'
import { OffsetTableHeaders } from './OffsetTableHeaders'

import type { TFunction } from 'i18next'
import type { LPCWizardContentProps } from '/app/organisms/LabwarePositionCheck/types'
import type { SelectedLwOverview } from '/app/redux/protocol-runs'

export function LocationSpecificOffsetsContainer(
  props: LPCWizardContentProps
): JSX.Element {
  const { t } = useTranslation('labware_position_check')
  const { t: commandTextT } = useTranslation('protocol_command_text')
  const { uri } = useSelector(
    selectSelectedLwOverview(props.runId)
  ) as SelectedLwOverview
  const sortedDetailsBySlot = useSelector(
    selectSortedLSOffsetDetailsWithCopy(
      props.runId,
      uri,
      commandTextT as TFunction
    )
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
                key={`${offset.locationDetails.addressableAreaName}${offset.locationDetails.closestBeneathModuleId}${offset.locationDetails.closestBeneathAdapterId}`}
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
