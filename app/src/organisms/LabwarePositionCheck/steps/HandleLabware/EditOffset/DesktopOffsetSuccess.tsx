import { useTranslation } from 'react-i18next'
import { css } from 'styled-components'
import { useSelector } from 'react-redux'

import {
  ALIGN_CENTER,
  DIRECTION_COLUMN,
  Flex,
  getLabwareDisplayLocation,
  SPACING,
  StyledText,
} from '@opentrons/components'
import { FLEX_ROBOT_TYPE, getModuleDisplayName } from '@opentrons/shared-data'

import { LPCContentContainer } from '/app/organisms/LabwarePositionCheck/LPCContentContainer'
import {
  selectSelectedLwDisplayName,
  selectSelectedLwFlowType,
  selectSelectedLwOverview,
  selectSelectedLwWithOffsetDetailsMostRecentVectorOffset,
} from '/app/redux/protocol-runs'

import SuccessIcon from '/app/assets/images/icon_success.png'

import type { DisplayLocationParams } from '@opentrons/components'
import type { EditOffsetContentProps } from '/app/organisms/LabwarePositionCheck/steps/HandleLabware/EditOffset'
import type { State } from '/app/redux/types'
import type {
  SelectedLwOverview,
  LPCWizardState,
  OffsetLocationDetails,
} from '/app/redux/protocol-runs'

// TOME TODO: If you adjust the default offset to match applied location offsets,
// those offsets don't go back to the default!

interface DesktopOffsetSuccessProps extends EditOffsetContentProps {
  handleAddConfirmedWorkingVector: () => void
}

export function DesktopOffsetSuccess(
  props: DesktopOffsetSuccessProps
): JSX.Element {
  const { t } = useTranslation('labware_position_check')
  const { t: commandTextT } = useTranslation('protocol_command_text')
  const flowType = useSelector(selectSelectedLwFlowType(props.runId))
  const mostRecentVectorOffset = useSelector(
    selectSelectedLwWithOffsetDetailsMostRecentVectorOffset(props.runId)
  )
  const { protocolData } = useSelector(
    (state: State) => state.protocolRuns[props.runId]?.lpc as LPCWizardState
  )
  const selectedLwInfo = useSelector(
    selectSelectedLwOverview(props.runId)
  ) as SelectedLwOverview
  const moduleModel = selectedLwInfo.offsetLocationDetails?.moduleModel
  const offsetLocationDetails = selectedLwInfo.offsetLocationDetails as OffsetLocationDetails
  const labwareDisplayName = useSelector(
    selectSelectedLwDisplayName(props.runId)
  )

  const buildDisplayParams = (): Omit<
    DisplayLocationParams,
    'detailLevel'
  > => ({
    t: commandTextT,
    loadedModules: protocolData.modules,
    loadedLabwares: protocolData.labware,
    robotType: FLEX_ROBOT_TYPE,
    location: offsetLocationDetails,
  })
  const slotOnlyDisplayLocation = getLabwareDisplayLocation({
    detailLevel: 'slot-only',
    ...buildDisplayParams(),
  })

  const bodyText = (): string => {
    switch (flowType) {
      case 'default': {
        if (mostRecentVectorOffset == null) {
          return t('labware_default_offset_added', {
            labware: labwareDisplayName,
          })
        } else {
          return t('labware_default_offset_updated', {
            labware: labwareDisplayName,
          })
        }
      }
      case 'location-specific': {
        if (moduleModel != null) {
          return t('slot_in_module_applied_location_offset_updated', {
            slot: slotOnlyDisplayLocation,
            module: getModuleDisplayName(moduleModel),
          })
        } else {
          return t('slot_applied_location_offset_updated', {
            slot: slotOnlyDisplayLocation,
          })
        }
      }
      default: {
        console.error('Unhandled flow type.')
        return t('add_default_labware_offset')
      }
    }
  }

  return (
    <LPCContentContainer
      {...props}
      header={t('labware_position_check_title')}
      buttonText={t('continue')}
      onClickButton={props.handleAddConfirmedWorkingVector}
    >
      <Flex css={CONTENT_CONTAINER}>
        <img src={SuccessIcon} css={IMAGE_STYLE} alt="Success Icon" />
        <StyledText desktopStyle="headingSmallBold">{bodyText()}</StyledText>
      </Flex>
    </LPCContentContainer>
  )
}

const CONTENT_CONTAINER = css`
  flex-direction: ${DIRECTION_COLUMN};
  align-items: ${ALIGN_CENTER};
  padding: ${SPACING.spacing40};
  gap: ${SPACING.spacing24};
`

const IMAGE_STYLE = css`
  width: 10.625rem;
  height: 8.813rem;
`
