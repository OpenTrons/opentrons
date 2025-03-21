import { useEffect, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { css } from 'styled-components'
import { useDispatch, useSelector } from 'react-redux'

import {
  ALIGN_CENTER,
  ALIGN_FLEX_START,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  JUSTIFY_FLEX_END,
  LegacyStyledText,
  RESPONSIVENESS,
  SPACING,
  StyledText,
  TYPOGRAPHY,
} from '@opentrons/components'
import {
  getVectorDifference,
  getVectorSum,
  IDENTITY_VECTOR,
} from '@opentrons/shared-data'

import { SmallButton, TextOnlyButton } from '/app/atoms/buttons'
import { JogControls } from '/app/molecules/JogControls'
import {
  selectSelectedLwWithOffsetDetailsMostRecentVectorOffset,
  selectActivePipette,
  selectIsSelectedLwTipRack,
  selectSelectedLwOverview,
  goBackEditOffsetSubstep,
  proceedEditOffsetSubstep,
  selectSelectedLwWithOffsetDetailsWorkingOffsets,
  getFlexSlotNameOnly,
} from '/app/redux/protocol-runs'
import { getIsOnDevice } from '/app/redux/config'
import { LPCJogControlsOdd } from '/app/organisms/LabwarePositionCheck/steps/HandleLabware/EditOffset/CheckLabware/LPCJogControlsOdd'
import { LPCLabwareJogRender } from '/app/organisms/LabwarePositionCheck/steps/HandleLabware/EditOffset/CheckLabware/LPCLabwareJogRender'
import { OffsetTag } from '/app/organisms/LabwarePositionCheck/OffsetTag'
import { LPCContentContainer } from '/app/organisms/LabwarePositionCheck/LPCContentContainer'

import type { TFunction } from 'i18next'
import type { LoadedPipette, Coordinates } from '@opentrons/shared-data'
import type { VectorOffset } from '@opentrons/api-client'
import type {
  LPCWizardState,
  SelectedLwOverview,
  OffsetLocationDetails,
} from '/app/redux/protocol-runs'
import type { State } from '/app/redux/types'
import type { EditOffsetContentProps } from '/app/organisms/LabwarePositionCheck/steps/HandleLabware/EditOffset'

interface CheckLabwareProps extends EditOffsetContentProps {
  handleAddConfirmedWorkingVector: () => void
}

export function CheckLabware(props: CheckLabwareProps): JSX.Element {
  const { runId, commandUtils, contentHeader } = props
  const {
    toggleRobotMoving,
    handleJog,
    resetJog,
    handleResetLwModulesOnDeck,
  } = commandUtils
  const { t } = useTranslation('labware_position_check')
  const { t: commandTextT } = useTranslation('protocol_command_text')
  const dispatch = useDispatch()

  const isOnDevice = useSelector(getIsOnDevice)
  const { protocolData } = useSelector(
    (state: State) => state.protocolRuns[runId]?.lpc as LPCWizardState
  )
  const workingInitialOffset = useSelector(
    selectSelectedLwWithOffsetDetailsWorkingOffsets(runId)
  )?.initialPosition as VectorOffset
  const mostRecentVector = useSelector(
    selectSelectedLwWithOffsetDetailsMostRecentVectorOffset(runId)
  )
  const isLwTiprack = useSelector(selectIsSelectedLwTipRack(runId))
  const selectedLwInfo = useSelector(
    selectSelectedLwOverview(runId)
  ) as SelectedLwOverview
  const offsetLocationDetails = selectedLwInfo.offsetLocationDetails as OffsetLocationDetails
  const pipette = useSelector(selectActivePipette(runId)) as LoadedPipette

  const [joggedPosition, setJoggedPosition] = useState<VectorOffset>(
    workingInitialOffset
  )

  const liveOffset = getVectorSum(
    mostRecentVector ?? IDENTITY_VECTOR,
    getVectorDifference(joggedPosition, workingInitialOffset)
  )

  useEffect(() => {
    //  NOTE: this will perform a "null" jog when the jog controls mount so
    //  if a user reaches the "confirm exit" modal (unmounting this component)
    //  and clicks "go back" we are able so initialize the live offset to whatever
    //  distance they had already jogged before clicking exit.
    // the `mounted` variable prevents a possible memory leak (see https://legacy.reactjs.org/docs/hooks-effect.html#example-using-hooks-1)
    let mounted = true
    if (mounted) {
      handleJog('x', 1, 0, setJoggedPosition)
    }
    return () => {
      mounted = false
    }
  }, [])

  const slotOnlyDisplayLocation = getFlexSlotNameOnly(
    selectedLwInfo.offsetLocationDetails,
    protocolData,
    commandTextT as TFunction
  )

  const buildSectionHeader = (): string =>
    t('check_item_in_location', {
      item: isLwTiprack ? t('tip_rack') : t('labware'),
      location: slotOnlyDisplayLocation,
    })

  const handleGoBack = (): void => {
    void toggleRobotMoving(true)
      .then(() => handleResetLwModulesOnDeck(offsetLocationDetails))
      .then(() => {
        dispatch(goBackEditOffsetSubstep(runId))
      })
      .finally(() => toggleRobotMoving(false))
  }

  const handleResetJog = (): void => {
    void resetJog(
      offsetLocationDetails,
      pipette.id,
      mostRecentVector ?? IDENTITY_VECTOR
    ).then(() => {
      setJoggedPosition(workingInitialOffset)
    })
  }

  return isOnDevice ? (
    <CheckLabwareContentODD
      {...props}
      contentHeader={contentHeader}
      sectionHeader={buildSectionHeader()}
      handleGoBack={handleGoBack}
      handleResetJog={handleResetJog}
      liveOffset={liveOffset}
      isLwTiprack={isLwTiprack}
      setJoggedPosition={setJoggedPosition}
    />
  ) : (
    <CheckLabwareContentDesktop
      {...props}
      contentHeader={contentHeader}
      sectionHeader={buildSectionHeader()}
      handleGoBack={handleGoBack}
      handleResetJog={handleResetJog}
      liveOffset={liveOffset}
      isLwTiprack={isLwTiprack}
      setJoggedPosition={setJoggedPosition}
    />
  )
}

interface CheckLabwareContentProps extends CheckLabwareProps {
  contentHeader: string
  sectionHeader: string
  handleGoBack: () => void
  handleResetJog: () => void
  setJoggedPosition: (vector: VectorOffset) => void
  liveOffset: Coordinates
  isLwTiprack: boolean
}

function CheckLabwareContentODD(props: CheckLabwareContentProps): JSX.Element {
  const { t } = useTranslation('labware_position_check')
  const {
    contentHeader,
    sectionHeader,
    handleAddConfirmedWorkingVector,
    handleGoBack,
    isLwTiprack,
    liveOffset,
    setJoggedPosition,
  } = props
  const [showOddJogControls, setShowOddJogControls] = useState(false)

  const handleProceed = (): void => {
    handleAddConfirmedWorkingVector()
  }

  return (
    <>
      <LPCContentContainer
        {...props}
        header={contentHeader}
        buttonText={t('confirm_placement')}
        onClickButton={handleProceed}
        onClickBack={handleGoBack}
      >
        <Flex css={CONTENT_CONTAINER_STYLE}>
          <Flex css={CONTENT_GRID_STYLE}>
            <Flex css={INFO_CONTAINER_STYLE}>
              <StyledText oddStyle="level4HeaderSemiBold">
                {sectionHeader}
              </StyledText>
              <Trans
                t={t}
                i18nKey={'ensure_nozzle_position_odd'}
                values={{
                  tip_type: t('calibration_probe'),
                  item_location: isLwTiprack
                    ? t('check_tip_location')
                    : t('check_well_location'),
                }}
                components={{
                  block: <LegacyStyledText as="p" />,
                  bold: <strong />,
                }}
              />
              <Flex css={OFFSET_CONTAINER_STYLE}>
                {/* TODO(jh, 03-07-25): smallBodyTextSemiBold does not display proper font weight. */}
                {/* Work with Design to update this. */}
                <StyledText
                  css={OFFSET_COPY_STYLE}
                  desktopStyle="bodyDefaultSemiBold"
                >
                  {t('labware_offset_data')}
                </StyledText>
                <OffsetTag kind="vector" {...liveOffset} />
              </Flex>
            </Flex>
            <LPCLabwareJogRender {...props} />
          </Flex>
          <Flex css={ODD_BOTTOM_CONTENT_CONTAINER_STYLE}>
            <SmallButton
              flex="1"
              buttonType="secondary"
              buttonText={t('move_pipette')}
              onClick={() => {
                setShowOddJogControls(true)
              }}
            />
          </Flex>
        </Flex>
      </LPCContentContainer>
      {showOddJogControls && (
        <LPCJogControlsOdd
          {...props}
          toggleJogControls={() => {
            setShowOddJogControls(false)
          }}
          setJoggedPosition={setJoggedPosition}
        />
      )}
    </>
  )
}

function CheckLabwareContentDesktop(
  props: CheckLabwareContentProps
): JSX.Element {
  const { t } = useTranslation('labware_position_check')
  const {
    contentHeader,
    sectionHeader,
    handleGoBack,
    isLwTiprack,
    liveOffset,
    handleResetJog,
    setJoggedPosition,
    commandUtils,
    runId,
  } = props
  const dispatch = useDispatch()

  const handleProceed = (): void => {
    dispatch(proceedEditOffsetSubstep(runId, true))
  }

  return (
    <LPCContentContainer
      {...props}
      header={contentHeader}
      buttonText={t('confirm_placement')}
      onClickButton={handleProceed}
      onClickBack={handleGoBack}
      containerStyle={DESKTOP_CONTAINER_STYLE}
      contentStyle={DESKTOP_CONTENT_CONTAINER_STYLE}
    >
      <Flex css={CONTENT_CONTAINER_STYLE}>
        <Flex css={CONTENT_GRID_STYLE}>
          <Flex css={INFO_CONTAINER_STYLE}>
            <StyledText desktopStyle="headingSmallBold">
              {sectionHeader}
            </StyledText>
            <Trans
              t={t}
              i18nKey={'ensure_nozzle_position_desktop'}
              values={{
                tip_type: t('calibration_probe'),
                item_location: isLwTiprack
                  ? t('check_tip_location')
                  : t('check_well_location'),
              }}
              components={{
                block: <LegacyStyledText as="p" />,
                bold: <strong />,
              }}
            />
            <Flex css={OFFSET_CONTAINER_STYLE}>
              {/* TODO(jh, 03-07-25): smallBodyTextSemiBold does not display proper font weight. */}
              {/* Work with Design to update this. */}
              <StyledText
                css={OFFSET_COPY_STYLE}
                desktopStyle="bodyDefaultSemiBold"
              >
                {t('labware_offset_data')}
              </StyledText>
              <OffsetTag kind="vector" {...liveOffset} />
            </Flex>
          </Flex>
          <LPCLabwareJogRender {...props} />
        </Flex>
        <Flex css={DESKTOP_BOTTOM_CONTENT_CONTAINER_STYLE}>
          <JogControls
            jog={(axis, direction, step, _onSuccess) =>
              commandUtils.handleJog(axis, direction, step, setJoggedPosition)
            }
          />
          <Flex css={JOG_TOO_FAR_CONTAINER}>
            <StyledText desktopStyle="bodyDefaultRegular">
              {t('jog_too_far')}
            </StyledText>
            <TextOnlyButton
              onClick={handleResetJog}
              buttonText={
                <StyledText
                  desktopStyle="bodyDefaultRegLink"
                  color={COLORS.black90}
                >
                  {t('start_over')}
                </StyledText>
              }
            />
          </Flex>
        </Flex>
      </Flex>
    </LPCContentContainer>
  )
}

const CONTENT_CONTAINER_STYLE = css`
  flex-direction: ${DIRECTION_COLUMN};
  height: 100%;
  width: 100%;

  flex-direction: ${DIRECTION_COLUMN};
  gap: ${SPACING.spacing40};

  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    gap: 0;
  }
`

const CONTENT_GRID_STYLE = css`
  grid-gap: ${SPACING.spacing40};

  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    grid-gap: ${SPACING.spacing24};
  }
`

const INFO_CONTAINER_STYLE = css`
  flex: 1;
  flex-direction: ${DIRECTION_COLUMN};
  grid-gap: ${SPACING.spacing16};
  align-items: ${ALIGN_FLEX_START};

  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    grid-gap: ${SPACING.spacing24};
  }
`

const OFFSET_CONTAINER_STYLE = css`
  flex-direction: ${DIRECTION_COLUMN};
  gap: ${SPACING.spacing8};
`

const OFFSET_COPY_STYLE = css`
  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    font-weight: ${TYPOGRAPHY.fontWeightSemiBold};
    font-size: ${TYPOGRAPHY.fontSize20};
    line-height: ${TYPOGRAPHY.lineHeight24};
  }
`

const ODD_BOTTOM_CONTENT_CONTAINER_STYLE = css`
  margin-top: auto;
`

const DESKTOP_BOTTOM_CONTENT_CONTAINER_STYLE = css`
  flex-direction: ${DIRECTION_COLUMN};
  gap: ${SPACING.spacing8};
`

const JOG_TOO_FAR_CONTAINER = css`
  gap: ${SPACING.spacing4};
  justify-content: ${JUSTIFY_FLEX_END};
  align-items: ${ALIGN_CENTER};
`

// The design system makes a height exception for this view.
const DESKTOP_CONTAINER_STYLE = css`
  height: 39.25rem;
  width: 47rem;
`
const DESKTOP_CONTENT_CONTAINER_STYLE = css`
  height: 35.5rem;
  flex-direction: ${DIRECTION_COLUMN};
  padding: ${SPACING.spacing24};
  gap: ${SPACING.spacing24};
  overflow-y: hidden;
`
