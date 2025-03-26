import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css } from 'styled-components'
import { useTranslation } from 'react-i18next'

import {
  DIRECTION_COLUMN,
  Flex,
  RESPONSIVENESS,
  SPACING,
} from '@opentrons/components'

import { LocationSpecificOffsetsContainer } from './LocationSpecificOffsetsContainer'
import { DefaultLocationOffset } from './DefaultLocationOffset'
import {
  applyWorkingOffsets,
  goBackEditOffsetSubstep,
  selectIsAnyOffsetHardCoded,
  selectIsDefaultOffsetAbsent,
  selectSelectedLwDisplayName,
  selectSelectedLwOverview,
  selectWorkingOffsetsByUri,
} from '/app/redux/protocol-runs'
import { InlineNotification } from '/app/atoms/InlineNotification'
import { LPCContentContainer } from '/app/organisms/LabwarePositionCheck/LPCContentContainer'
import {
  handleUnsavedOffsetsModalODD,
  UnsavedOffsetsDesktop,
} from '/app/organisms/LabwarePositionCheck/steps/HandleLabware/UnsavedOffsets'
import { getIsOnDevice } from '/app/redux/config'

import type { LPCWizardContentProps } from '/app/organisms/LabwarePositionCheck/types'

export function LPCLabwareDetails(props: LPCWizardContentProps): JSX.Element {
  const { runId, commandUtils } = props
  const { isSavingWorkingOffsetsLoading, saveWorkingOffsets } = commandUtils
  const { t } = useTranslation('labware_position_check')
  const dispatch = useDispatch()
  const [showUnsavedOffsetsDesktop, setShowUnsavedOffsetsDesktop] = useState(
    false
  )

  const isOnDevice = useSelector(getIsOnDevice)
  const selectedLwName = useSelector(selectSelectedLwDisplayName(runId))
  const workingOffsetsByUri = useSelector(selectWorkingOffsetsByUri(runId))
  const doWorkingOffsetsExist = Object.keys(workingOffsetsByUri).length > 0

  const onHeaderGoBack = (): void => {
    if (doWorkingOffsetsExist) {
      if (isOnDevice) {
        void handleUnsavedOffsetsModalODD(props)
      } else {
        setShowUnsavedOffsetsDesktop(true)
      }
    } else {
      dispatch(goBackEditOffsetSubstep(runId))
    }
  }

  const onHeaderSave = (): void => {
    if (doWorkingOffsetsExist && !isSavingWorkingOffsetsLoading) {
      void saveWorkingOffsets().then(updatedOffsetData => {
        dispatch(applyWorkingOffsets(runId, updatedOffsetData))
        dispatch(goBackEditOffsetSubstep(runId))
      })
    }
  }

  return (
    <>
      {!showUnsavedOffsetsDesktop ? (
        <LPCContentContainer
          {...props}
          header={selectedLwName}
          buttonText={t('save')}
          onClickButton={onHeaderSave}
          onClickBack={onHeaderGoBack}
          buttonIsDisabled={!doWorkingOffsetsExist}
          tertiaryBtnProps={{
            text: t('view_labware_list'),
            onClick: onHeaderGoBack,
          }}
          containerStyle={isOnDevice ? undefined : DESKTOP_CONTAINER_STYLE}
          contentStyle={
            isOnDevice ? undefined : DESKTOP_CONTENT_CONTAINER_STYLE
          }
        >
          <LPCLabwareDetailsContent {...props} />
        </LPCContentContainer>
      ) : (
        <UnsavedOffsetsDesktop
          {...props}
          toggleShowUnsavedOffsetsDesktop={() => {
            setShowUnsavedOffsetsDesktop(!showUnsavedOffsetsDesktop)
          }}
        />
      )}
    </>
  )
}

function LPCLabwareDetailsContent(props: LPCWizardContentProps): JSX.Element {
  const { t } = useTranslation('labware_position_check')
  const { runId } = props

  const selectedLwInfo = useSelector(selectSelectedLwOverview(runId))
  const isOnDevice = useSelector(getIsOnDevice)
  const uri = selectedLwInfo?.uri ?? ''
  const isDefaultOffsetAbsent = useSelector(
    selectIsDefaultOffsetAbsent(runId, uri)
  )
  const isAnyOffsetHardCoded = useSelector(
    selectIsAnyOffsetHardCoded(runId, uri)
  )

  const [showDefaultBanner, setShowDefaultBanner] = useState(
    isDefaultOffsetAbsent
  )
  const [showHardCodedBanner, setShowHardCodedBanner] = useState(
    isAnyOffsetHardCoded
  )

  return (
    <Flex css={LIST_CONTAINER_STYLE}>
      {showDefaultBanner && (
        <InlineNotification
          type="alert"
          heading={t('add_a_default_offset')}
          message={t('specific_slots_can_be_adjusted')}
          onCloseClick={
            isOnDevice
              ? undefined
              : () => {
                  setShowDefaultBanner(false)
                }
          }
        />
      )}
      {showHardCodedBanner && (
        <InlineNotification
          type="neutral"
          heading={t('changing_default_not_update_hardcoded')}
          message={t('hardcoded_offsets_changed_in_python')}
          onCloseClick={
            isOnDevice
              ? undefined
              : () => {
                  setShowHardCodedBanner(false)
                }
          }
        />
      )}
      <DefaultLocationOffset {...props} />
      <LocationSpecificOffsetsContainer {...props} />
      {/* Accommodate scrolling on the ODD. */}
      <Flex css={ODD_SCROLL_BUFFER} />
    </Flex>
  )
}

export const LIST_CONTAINER_STYLE = css`
  flex-direction: ${DIRECTION_COLUMN};
  gap: ${SPACING.spacing16};

  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    gap: ${SPACING.spacing24};
  }
`

const ODD_SCROLL_BUFFER = css`
  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    height: ${SPACING.spacing40};
  }
`

// The design system makes a height exception for this view.
const DESKTOP_CONTAINER_STYLE = css`
  height: 35.375rem;
  width: 47rem;
`
const DESKTOP_CONTENT_CONTAINER_STYLE = css`
  height: 31.625rem;
  flex-direction: ${DIRECTION_COLUMN};
  padding: ${SPACING.spacing24};
  gap: ${SPACING.spacing24};
  overflow-y: auto;
`
