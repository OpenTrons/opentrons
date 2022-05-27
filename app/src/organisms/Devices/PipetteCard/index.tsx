import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector, useDispatch } from 'react-redux'
import {
  Box,
  Flex,
  DIRECTION_ROW,
  ALIGN_START,
  DIRECTION_COLUMN,
  TEXT_TRANSFORM_UPPERCASE,
  SPACING,
  FONT_WEIGHT_REGULAR,
  FONT_SIZE_CAPTION,
  useInterval,
  TYPOGRAPHY,
  COLORS,
  useOnClickOutside,
  InstrumentDiagram,
  BORDERS,
  Btn,
  TEXT_DECORATION_UNDERLINE,
} from '@opentrons/components'
import { LEFT } from '../../../redux/pipettes'
import { OverflowBtn } from '../../../atoms/MenuList/OverflowBtn'
import { Portal } from '../../../App/portal'
import { StyledText } from '../../../atoms/text'
import { getHasCalibrationBlock } from '../../../redux/config'
import { Banner } from '../../../atoms/Banner'
import { fetchPipetteOffsetCalibrations } from '../../../redux/calibration'
import { ChangePipette } from '../../ChangePipette'
import { useCalibratePipetteOffset } from '../../CalibratePipetteOffset/useCalibratePipetteOffset'
import {
  INTENT_CALIBRATE_PIPETTE_OFFSET,
  INTENT_RECALIBRATE_PIPETTE_OFFSET,
} from '../../CalibrationPanels'
import { AskForCalibrationBlockModal } from '../../CalibrateTipLength'
import { useDeckCalibrationData, usePipetteOffsetCalibration } from '../hooks'
import { PipetteOverflowMenu } from './PipetteOverflowMenu'
import { PipetteSettingsSlideout } from './PipetteSettingsSlideout'
import { AboutPipetteSlideout } from './AboutPipetteSlideout'

import type { AttachedPipette, Mount } from '../../../redux/pipettes/types'
import type { PipetteModelSpecs } from '@opentrons/shared-data'
import type { Dispatch } from '../../../redux/types'

interface PipetteCardProps {
  pipetteInfo: PipetteModelSpecs | null
  pipetteId?: AttachedPipette['id'] | null
  mount: Mount
  robotName: string
}

const FETCH_PIPETTE_CAL_MS = 30000

export const PipetteCard = (props: PipetteCardProps): JSX.Element => {
  const { t } = useTranslation('device_details')
  const [showOverflowMenu, setShowOverflowMenu] = React.useState(false)
  const { pipetteInfo, mount, robotName, pipetteId } = props
  const dispatch = useDispatch<Dispatch>()
  const pipetteName = pipetteInfo?.displayName
  const pipetteOverflowWrapperRef = useOnClickOutside({
    onClickOutside: () => setShowOverflowMenu(false),
  }) as React.RefObject<HTMLDivElement>
  const [showChangePipette, setChangePipette] = React.useState(false)
  const [showBanner, setShowBanner] = React.useState(true)
  const [showSlideout, setShowSlideout] = React.useState(false)
  const [showAboutSlideout, setShowAboutSlideout] = React.useState(false)
  const [showCalBlockModal, setShowCalBlockModal] = React.useState(false)
  const configHasCalibrationBlock = useSelector(getHasCalibrationBlock)
  const { isDeckCalibrated } = useDeckCalibrationData(robotName)
  const [
    startPipetteOffsetCalibration,
    PipetteOffsetCalibrationWizard,
  ] = useCalibratePipetteOffset(robotName, { mount })

  const pipetteOffsetCalibration = usePipetteOffsetCalibration(
    robotName,
    pipetteId,
    mount
  )

  useInterval(
    () => {
      dispatch(fetchPipetteOffsetCalibrations(robotName))
    },
    pipetteOffsetCalibration === null ? 1000 : FETCH_PIPETTE_CAL_MS,
    true
  )

  const badCalibration = pipetteOffsetCalibration?.status.markedBad

  const startPipetteOffsetCalibrationBlockModal = (
    hasBlockModalResponse: boolean | null
  ): void => {
    if (hasBlockModalResponse === null && configHasCalibrationBlock === null) {
      setShowCalBlockModal(true)
    } else {
      startPipetteOffsetCalibration({
        overrideParams: {
          hasCalibrationBlock: Boolean(
            configHasCalibrationBlock ?? hasBlockModalResponse
          ),
        },
        withIntent: pipetteOffsetCalibration
          ? INTENT_RECALIBRATE_PIPETTE_OFFSET
          : INTENT_CALIBRATE_PIPETTE_OFFSET,
      })

      setShowCalBlockModal(false)
    }
  }

  const handleChangePipette = (): void => {
    setChangePipette(true)
  }
  const handleCalibrate = (): void => {
    startPipetteOffsetCalibrationBlockModal(null)
  }
  const handleAboutSlideout = (): void => {
    setShowAboutSlideout(true)
  }
  const handleSettingsSlideout = (): void => {
    setShowSlideout(true)
  }
  return (
    <Flex
      backgroundColor={COLORS.background}
      borderRadius={BORDERS.radiusSoftCorners}
      marginBottom={SPACING.spacing3}
      marginX={SPACING.spacing2}
      width={'100%'}
      data-testid={`PipetteCard_${pipetteName}`}
    >
      {showChangePipette && (
        <ChangePipette
          robotName={robotName}
          mount={mount}
          closeModal={() => setChangePipette(false)}
        />
      )}
      {showSlideout && pipetteInfo != null && pipetteId != null && (
        <PipetteSettingsSlideout
          robotName={robotName}
          pipetteName={pipetteInfo.displayName}
          onCloseClick={() => setShowSlideout(false)}
          isExpanded={true}
          pipetteId={pipetteId}
        />
      )}
      {PipetteOffsetCalibrationWizard}
      {showAboutSlideout && pipetteInfo != null && pipetteId != null && (
        <AboutPipetteSlideout
          pipetteId={pipetteId}
          pipetteName={pipetteInfo.displayName}
          onCloseClick={() => setShowAboutSlideout(false)}
          isExpanded={true}
        />
      )}
      {showCalBlockModal && (
        <Portal level="top">
          <AskForCalibrationBlockModal
            onResponse={hasBlockModalResponse => {
              startPipetteOffsetCalibrationBlockModal(hasBlockModalResponse)
            }}
            titleBarTitle={t('pipette_offset_cal')}
            closePrompt={() => setShowCalBlockModal(false)}
          />
        </Portal>
      )}
      <Box padding={`${SPACING.spacing4} ${SPACING.spacing3}`} width="100%">
        <Flex flexDirection={DIRECTION_ROW} paddingRight={SPACING.spacing3}>
          <Flex alignItems={ALIGN_START}>
            {pipetteInfo === null ? null : (
              <InstrumentDiagram
                pipetteSpecs={pipetteInfo}
                mount={mount}
                transform="scale(0.3)"
                size="3.125rem"
                transformOrigin="20% -10%"
              />
            )}
          </Flex>
          <Flex flexDirection={DIRECTION_COLUMN} paddingLeft={SPACING.spacing3}>
            {!isDeckCalibrated &&
            pipetteOffsetCalibration == null &&
            pipetteInfo != null &&
            showBanner ? (
              <Flex paddingBottom={SPACING.spacing2}>
                <Banner type="error" onCloseClick={() => setShowBanner(false)}>
                  {t('deck_cal_missing')}
                </Banner>
              </Flex>
            ) : null}
            {isDeckCalibrated &&
            pipetteOffsetCalibration == null &&
            pipetteInfo != null &&
            showBanner ? (
              <Flex paddingBottom={SPACING.spacing2}>
                <Banner type="error" onCloseClick={() => setShowBanner(false)}>
                  <Flex flexDirection={DIRECTION_COLUMN}>
                    {t('pipette_offset_calibration_needed')}
                    <Btn
                      textAlign={ALIGN_START}
                      fontSize={TYPOGRAPHY.fontSizeP}
                      textDecoration={TEXT_DECORATION_UNDERLINE}
                      onClick={handleCalibrate}
                    >
                      {t('calibrate_now')}
                    </Btn>
                  </Flex>
                </Banner>
              </Flex>
            ) : null}
            {isDeckCalibrated && badCalibration && showBanner ? (
              <Flex paddingBottom={SPACING.spacing2}>
                <Banner
                  type="warning"
                  onCloseClick={() => setShowBanner(false)}
                >
                  <Flex flexDirection={DIRECTION_COLUMN}>
                    {t('pipette_cal_recommended')}
                    <Btn
                      textAlign={ALIGN_START}
                      fontSize={TYPOGRAPHY.fontSizeP}
                      textDecoration={TEXT_DECORATION_UNDERLINE}
                      onClick={handleCalibrate}
                    >
                      {t('recalibrate_now')}
                    </Btn>
                  </Flex>
                </Banner>
              </Flex>
            ) : null}
            <StyledText
              textTransform={TEXT_TRANSFORM_UPPERCASE}
              color={COLORS.darkGrey}
              fontWeight={FONT_WEIGHT_REGULAR}
              fontSize={FONT_SIZE_CAPTION}
              paddingBottom={SPACING.spacing2}
              data-testid={`PipetteCard_mount_${pipetteName}`}
            >
              {t('mount', { side: mount === LEFT ? t('left') : t('right') })}
            </StyledText>
            <Flex
              paddingBottom={SPACING.spacing2}
              data-testid={`PipetteCard_display_name_${pipetteName}`}
            >
              <StyledText fontSize={TYPOGRAPHY.fontSizeP}>
                {pipetteName ?? t('empty')}
              </StyledText>
            </Flex>
          </Flex>
        </Flex>
      </Box>
      <Box
        alignSelf={ALIGN_START}
        padding={SPACING.spacing2}
        data-testid={`PipetteCard_overflow_btn_${pipetteName}`}
      >
        <OverflowBtn
          aria-label="overflow"
          onClick={() => {
            setShowOverflowMenu(prevShowOverflowMenu => !prevShowOverflowMenu)
          }}
        />
      </Box>
      {showOverflowMenu && (
        <div
          ref={pipetteOverflowWrapperRef}
          data-testid={`PipetteCard_overflow_menu_${pipetteName}`}
        >
          <PipetteOverflowMenu
            pipetteName={pipetteName ?? t('empty')}
            mount={mount}
            handleChangePipette={handleChangePipette}
            handleCalibrate={handleCalibrate}
            handleSettingsSlideout={handleSettingsSlideout}
            handleAboutSlideout={handleAboutSlideout}
            isPipetteCalibrated={pipetteOffsetCalibration != null}
          />
        </div>
      )}
    </Flex>
  )
}
