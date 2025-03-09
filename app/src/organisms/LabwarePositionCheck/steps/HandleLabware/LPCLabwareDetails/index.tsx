import { useDispatch, useSelector } from 'react-redux'
import { css } from 'styled-components'
import { useTranslation } from 'react-i18next'

import { DIRECTION_COLUMN, Flex, SPACING } from '@opentrons/components'

import { AppliedLocationOffsetsContainer } from './AppliedLocationOffsetsContainer'
import { DefaultLocationOffset } from './DefaultLocationOffset'
import {
  applyWorkingOffsets,
  goBackEditOffsetSubstep,
  selectIsDefaultOffsetAbsent,
  selectSelectedLabwareDisplayName,
  selectSelectedLabwareWithOffsetInfo,
  selectWorkingOffsetsByUri,
} from '/app/redux/protocol-runs'
import { InlineNotification } from '/app/atoms/InlineNotification'
import { LPCContentContainer } from '/app/organisms/LabwarePositionCheck/LPCContentContainer'
import { handleUnsavedOffsetsModal } from '/app/organisms/LabwarePositionCheck/steps/HandleLabware/UnsavedOffsetsModal'

import type { LPCWizardContentProps } from '/app/organisms/LabwarePositionCheck/types'

export function LPCLabwareDetails(props: LPCWizardContentProps): JSX.Element {
  const { runId } = props
  const { t } = useTranslation('labware_position_check')
  const dispatch = useDispatch()

  const lwUri =
    useSelector(selectSelectedLabwareWithOffsetInfo(runId))?.uri ?? ''
  // TOME TODO: There are multiple select name utils, and I'm pretty sure we can just move this to the offset info, or at least dupe it there.
  const selectedLwName = useSelector(selectSelectedLabwareDisplayName(runId))
  const workingOffsetsByUri = useSelector(selectWorkingOffsetsByUri(runId))
  const doWorkingOffsetsExist = Object.keys(workingOffsetsByUri).length > 0

  const onHeaderGoBack = (): void => {
    if (doWorkingOffsetsExist) {
      void handleUnsavedOffsetsModal(props)
    } else {
      dispatch(goBackEditOffsetSubstep(runId))
    }
  }

  const onHeaderSave = (): void => {
    if (doWorkingOffsetsExist) {
      // TODO(jh, 03-05-25): Add the actual API call here. Be sure to include loading state!
      dispatch(applyWorkingOffsets(runId, lwUri))
    }
  }

  return (
    <LPCContentContainer
      {...props}
      header={selectedLwName}
      buttonText={t('save')}
      onClickButton={onHeaderSave}
      onClickBack={onHeaderGoBack}
      buttonIsDisabled={!doWorkingOffsetsExist}
    >
      <LPCLabwareDetailsContent {...props} />
    </LPCContentContainer>
  )
}

function LPCLabwareDetailsContent(props: LPCWizardContentProps): JSX.Element {
  const { t } = useTranslation('labware_position_check')

  const selectedLwInfo = useSelector(
    selectSelectedLabwareWithOffsetInfo(props.runId)
  )
  const isMissingDefaultOffset = useSelector(
    selectIsDefaultOffsetAbsent(props.runId, selectedLwInfo?.uri ?? '')
  )

  // TODO(jh, 03-06-25): Add the "hardcoded" inline notification once hardcoded offsets
  //  are supported.
  return (
    <Flex css={LIST_CONTAINER_STYLE}>
      {isMissingDefaultOffset && (
        <InlineNotification
          type="alert"
          heading={t('add_a_default_offset')}
          message={t('specific_slots_can_be_adjusted')}
        />
      )}
      <DefaultLocationOffset {...props} />
      <AppliedLocationOffsetsContainer {...props} />
      {/* Gives extra scrollable space. */}
      <Flex css={BOX_STYLE} />
    </Flex>
  )
}

export const LIST_CONTAINER_STYLE = css`
  flex-direction: ${DIRECTION_COLUMN};
  gap: ${SPACING.spacing24};
`

const BOX_STYLE = css`
  height: ${SPACING.spacing40};
`
