import { useEffect, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import styled, { css } from 'styled-components'
import { useDispatch, useSelector } from 'react-redux'

import {
  ALIGN_CENTER,
  ALIGN_FLEX_START,
  DIRECTION_COLUMN,
  Flex,
  getLabwareDisplayLocation,
  JUSTIFY_SPACE_BETWEEN,
  LegacyStyledText,
  PrimaryButton,
  RESPONSIVENESS,
  SPACING,
  StyledText,
  TYPOGRAPHY,
} from '@opentrons/components'
import {
  FLEX_ROBOT_TYPE,
  getVectorDifference,
  getVectorSum,
  IDENTITY_VECTOR,
} from '@opentrons/shared-data'

import { SmallButton } from '/app/atoms/buttons'
import { NeedHelpLink } from '/app/molecules/OT2CalibrationNeedHelpLink'
import { JogControls } from '/app/molecules/JogControls'
import {
  selectSelectedLwWithOffsetDetailsMostRecentVectorOffset,
  selectActivePipette,
  selectIsSelectedLwTipRack,
  selectSelectedLwOverview,
  setFinalPosition,
  goBackEditOffsetSubstep,
  proceedEditOffsetSubstep,
  selectSelectedLwWithOffsetDetailsWorkingOffsets,
} from '/app/redux/protocol-runs'
import { getIsOnDevice } from '/app/redux/config'
import { LPCJogControlsOdd } from '/app/organisms/LabwarePositionCheck/steps/HandleLabware/EditOffset/CheckLabware/LPCJogControlsOdd'
import { LPCLabwareJogRender } from '/app/organisms/LabwarePositionCheck/steps/HandleLabware/EditOffset/CheckLabware/LPCLabwareJogRender'
import { OffsetTag } from '/app/organisms/LabwarePositionCheck/steps/HandleLabware/OffsetTag'
import { LPCContentContainer } from '/app/organisms/LabwarePositionCheck/LPCContentContainer'

import type { LoadedPipette } from '@opentrons/shared-data'
import type { VectorOffset } from '@opentrons/api-client'
import type { DisplayLocationParams } from '@opentrons/components'
import type {
  LPCWizardState,
  SelectedLwOverview,
  OffsetLocationDetails,
} from '/app/redux/protocol-runs'
import type { State } from '/app/redux/types'
import type { EditOffsetContentProps } from '/app/organisms/LabwarePositionCheck/steps/HandleLabware/EditOffset'

const LPC_HELP_LINK_URL =
  'https://support.opentrons.com/s/article/How-Labware-Offsets-work-on-the-OT-2'

export function CheckLabware(props: EditOffsetContentProps): JSX.Element {
  const { runId, commandUtils, contentHeader } = props
  const {
    toggleRobotMoving,
    handleConfirmLwFinalPosition,
    handleJog,
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

  const [showOddJogControls, setShowOddJogControls] = useState(false)

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

  const buildDisplayParams = (): Omit<
    DisplayLocationParams,
    'detailLevel'
  > => ({
    t: commandTextT,
    loadedModules: protocolData.modules,
    loadedLabwares: protocolData.labware,
    robotType: FLEX_ROBOT_TYPE,
    location: selectedLwInfo.offsetLocationDetails,
  })

  const slotOnlyDisplayLocation = getLabwareDisplayLocation({
    detailLevel: 'slot-only',
    ...buildDisplayParams(),
  })

  const buildHeader = (): string =>
    t('check_item_in_location', {
      item: isLwTiprack ? t('tip_rack') : t('labware'),
      location: slotOnlyDisplayLocation,
    })

  const handleProceed = (): void => {
    void toggleRobotMoving(true)
      .then(() => handleConfirmLwFinalPosition(offsetLocationDetails, pipette))
      .then(position => {
        dispatch(
          setFinalPosition(runId, {
            labwareUri: selectedLwInfo.uri,
            location: offsetLocationDetails,
            position,
          })
        )
      })
      .then(() => {
        dispatch(proceedEditOffsetSubstep(runId))
      })
      .finally(() => toggleRobotMoving(false))
  }

  const handleGoBack = (): void => {
    void toggleRobotMoving(true)
      .then(() => handleResetLwModulesOnDeck(offsetLocationDetails))
      .then(() => {
        dispatch(goBackEditOffsetSubstep(runId))
      })
      .finally(() => toggleRobotMoving(false))
  }

  // TODO(jh, 03-07-25): Componentize this further during the desktop view refactor.
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
              <Header>{buildHeader()}</Header>
              <Trans
                t={t}
                i18nKey={
                  isOnDevice
                    ? 'ensure_nozzle_position_odd'
                    : 'ensure_nozzle_position_desktop'
                }
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
                <StyledText css={OFFSET_COPY_STYLE}>
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
          <Flex css={DESKTOP_BOTTOM_CONTENT_CONTAINER_STYLE}>
            <JogControls
              jog={(axis, direction, step, _onSuccess) =>
                handleJog(axis, direction, step, setJoggedPosition)
              }
            />
            <Flex css={FOOTER_CONTAINER_STYLE}>
              <NeedHelpLink href={LPC_HELP_LINK_URL} />
              <Flex css={BUTTON_GROUP_STYLE}>
                <PrimaryButton onClick={handleProceed}>
                  {t('shared:confirm_position')}
                </PrimaryButton>
              </Flex>
            </Flex>
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

const CONTENT_CONTAINER_STYLE = css`
  flex-direction: ${DIRECTION_COLUMN};
  height: 100%;
  width: 100%;
`

const CONTENT_GRID_STYLE = css`
  grid-gap: ${SPACING.spacing24};
`

const INFO_CONTAINER_STYLE = css`
  flex: 1;
  flex-direction: ${DIRECTION_COLUMN};
  grid-gap: ${SPACING.spacing24};
  align-items: ${ALIGN_FLEX_START};
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

const FOOTER_CONTAINER_STYLE = css`
  width: 100%;
  margin-top: ${SPACING.spacing32};
  justify-content: ${JUSTIFY_SPACE_BETWEEN};
  align-items: ${ALIGN_CENTER};
`

const BUTTON_GROUP_STYLE = css`
  grid-gap: ${SPACING.spacing8};
  align-items: ${ALIGN_CENTER};
`

const Header = styled.h1`
  ${TYPOGRAPHY.h1Default}

  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    ${TYPOGRAPHY.level4HeaderSemiBold}
  }
`

const ODD_BOTTOM_CONTENT_CONTAINER_STYLE = css`
  margin-top: auto;

  @media not (${RESPONSIVENESS.touchscreenMediaQuerySpecs}) {
    display: none;
  }
`

const DESKTOP_BOTTOM_CONTENT_CONTAINER_STYLE = css`
  flex-direction: ${DIRECTION_COLUMN};

  @media (${RESPONSIVENESS.touchscreenMediaQuerySpecs}) {
    display: none;
  }
`
