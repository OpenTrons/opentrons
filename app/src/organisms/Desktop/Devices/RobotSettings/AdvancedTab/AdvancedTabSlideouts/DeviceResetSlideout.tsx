import { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useTranslation } from 'react-i18next'
import cloneDeep from 'lodash/cloneDeep'

import {
  ALIGN_CENTER,
  BORDERS,
  Box,
  CheckboxField,
  COLORS,
  DIRECTION_COLUMN,
  DIRECTION_ROW,
  Flex,
  Icon,
  JUSTIFY_SPACE_BETWEEN,
  Link,
  PrimaryButton,
  SPACING,
  LegacyStyledText,
  TYPOGRAPHY,
} from '@opentrons/components'
import { FLEX_ROBOT_TYPE, OT2_ROBOT_TYPE } from '@opentrons/shared-data'

import { Slideout } from '/app/atoms/Slideout'
import { Divider } from '/app/atoms/structure'
import { UNREACHABLE } from '/app/redux/discovery'
import {
  getResetConfigOptions,
  fetchResetConfigOptions,
} from '/app/redux/robot-admin'
import {
  useTrackEvent,
  ANALYTICS_CALIBRATION_DATA_DOWNLOADED,
} from '/app/redux/analytics'
import {
  useDeckCalibrationData,
  usePipetteOffsetCalibrations,
  useTipLengthCalibrations,
} from '../../../hooks'
import { useRobot, useIsFlex } from '/app/redux-resources/robots'
import { useNotifyAllRunsQuery } from '/app/resources/runs'

import type { MouseEventHandler } from 'react'
import type { State, Dispatch } from '/app/redux/types'
import type {
  ResetConfigOption,
  ResetConfigRequest,
} from '/app/redux/robot-admin/types'

interface DeviceResetSlideoutProps {
  isExpanded: boolean
  onCloseClick: () => void
  robotName: string
  updateResetStatus: (connected: boolean, rOptions?: ResetConfigRequest) => void
}

export function DeviceResetSlideout({
  isExpanded,
  onCloseClick,
  robotName,
  updateResetStatus,
}: DeviceResetSlideoutProps): JSX.Element {
  const { t } = useTranslation('device_settings')
  const doTrackEvent = useTrackEvent()
  const robot = useRobot(robotName)
  const dispatch = useDispatch<Dispatch>()
  const [
    displayedOptions,
    setDisplayedOptions,
  ] = useState<DisplayedResetOptionState>(ALL_DESELECTED)
  const runsQueryResponse = useNotifyAllRunsQuery()
  const isFlex = useIsFlex(robotName)

  // Calibration data
  const deckCalibrationData = useDeckCalibrationData(robotName)
  const pipetteOffsetCalibrations = usePipetteOffsetCalibrations()
  const tipLengthCalibrations = useTipLengthCalibrations()
  const serverOptions = useSelector((state: State) =>
    getResetConfigOptions(state, robotName)
  )
  // Check length>0 to cope with the current behavior of getResetConfigOptions.
  // Perhaps it should return null instead of [] if we don't have options loaded yet.
  const areServerOptionsLoaded =
    serverOptions != null && Object.keys(serverOptions).length > 0

  useEffect(() => {
    dispatch(fetchResetConfigOptions(robotName))
  }, [dispatch, robotName])

  const downloadCalibrationLogs: MouseEventHandler = e => {
    e.preventDefault()
    doTrackEvent({
      name: ANALYTICS_CALIBRATION_DATA_DOWNLOADED,
      properties: {
        robotType: isFlex ? FLEX_ROBOT_TYPE : OT2_ROBOT_TYPE,
      },
    })
    saveAs(
      new Blob([
        JSON.stringify({
          deck: deckCalibrationData,
          pipetteOffset: pipetteOffsetCalibrations,
          tipLength: tipLengthCalibrations,
        }),
      ]),
      `opentrons-${robotName}-calibration.json`
    )
  }

  const downloadRunHistoryLogs: MouseEventHandler = e => {
    e.preventDefault()
    const runsHistory =
      runsQueryResponse != null ? runsQueryResponse.data?.data : []
    saveAs(
      new Blob([JSON.stringify(runsHistory)]),
      `opentrons-${robotName}-runsHistory.json`
    )
  }

  const handleClearData = (): void => {
    const reachable = robot?.status !== UNREACHABLE
    updateResetStatus(
      reachable,
      buildResetRequest(displayedOptions, serverOptions, isFlex)
    )
    onCloseClick()
  }

  return (
    <Slideout
      title={t('device_reset')}
      onCloseClick={onCloseClick}
      isExpanded={isExpanded}
      footer={
        <PrimaryButton
          disabled={
            !isAnyOptionSelected(displayedOptions, isFlex) ||
            // handleClearData assumes options are loaded.
            !areServerOptionsLoaded
          }
          onClick={handleClearData}
          width="100%"
        >
          {t('clear_data_and_restart_robot')}
        </PrimaryButton>
      }
    >
      <Flex flexDirection={DIRECTION_COLUMN}>
        <Flex
          flexDirection={DIRECTION_ROW}
          alignItems={ALIGN_CENTER}
          backgroundColor={COLORS.yellow30}
          borderRadius={BORDERS.borderRadius4}
          padding={SPACING.spacing8}
          marginBottom={SPACING.spacing24}
        >
          <Icon
            name="alert-circle"
            size="1rem"
            marginRight={SPACING.spacing8}
            color={COLORS.yellow60}
          />
          <LegacyStyledText as="p">
            {t('resets_cannot_be_undone')}
          </LegacyStyledText>
        </Flex>
        {isFlex ? (
          <>
            <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing20}>
              <Flex flexDirection={DIRECTION_COLUMN}>
                <LegacyStyledText
                  as="p"
                  fontWeight={TYPOGRAPHY.fontWeightSemiBold}
                >
                  {t('clear_all_data')}
                </LegacyStyledText>
                <LegacyStyledText as="p" marginY={SPACING.spacing8}>
                  {t('clear_all_stored_data_description')}
                </LegacyStyledText>
                <CheckboxField
                  onChange={() => {
                    setDisplayedOptions(
                      isEveryOptionSelected(displayedOptions, isFlex)
                        ? ALL_DESELECTED
                        : ALL_SELECTED
                    )
                  }}
                  value={isEveryOptionSelected(displayedOptions, isFlex)}
                  label={t(`select_all_settings`)}
                  isIndeterminate={
                    !isEveryOptionSelected(displayedOptions, isFlex) &&
                    isAnyOptionSelected(displayedOptions, isFlex)
                  }
                />
              </Flex>
            </Flex>
            <Divider marginY={SPACING.spacing16} />
          </>
        ) : null}
        <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing8}>
          <LegacyStyledText as="p" fontWeight={TYPOGRAPHY.fontWeightSemiBold}>
            {t('clear_individual_data')}
          </LegacyStyledText>
          <LegacyStyledText as="p">
            {t('device_reset_slideout_description')}
          </LegacyStyledText>
          <Flex
            marginTop={SPACING.spacing20}
            flexDirection={DIRECTION_COLUMN}
            gridGap={SPACING.spacing20}
            paddingX={SPACING.spacing16}
          >
            <Box>
              <Flex
                flexDirection={DIRECTION_ROW}
                justifyContent={JUSTIFY_SPACE_BETWEEN}
                marginBottom="0.625rem"
              >
                <LegacyStyledText as="p" css={TYPOGRAPHY.pSemiBold}>
                  {t('robot_calibration_data')}
                </LegacyStyledText>
                <Link
                  role="button"
                  css={TYPOGRAPHY.linkPSemiBold}
                  onClick={downloadCalibrationLogs}
                >
                  {t('download')}
                </Link>
              </Flex>
              <Flex
                flexDirection={DIRECTION_COLUMN}
                gridGap={-SPACING.spacing4}
              >
                {isFlex ? (
                  <>
                    <CheckboxField
                      onChange={() => {
                        const options = cloneDeep(displayedOptions)
                        options.common.pipetteOffsetCalibrations = !options
                          .common.pipetteOffsetCalibrations
                        setDisplayedOptions(options)
                      }}
                      value={displayedOptions.common.pipetteOffsetCalibrations}
                      // Server option "pipette offset calibrations" branded "pipette calibrations" on Flex.
                      label={t('clear_option_pipette_calibrations')}
                    />
                    <CheckboxField
                      onChange={() => {
                        const options = cloneDeep(displayedOptions)
                        options.flexOnly.gripperCalibrations = !options.flexOnly
                          .gripperCalibrations
                        setDisplayedOptions(options)
                      }}
                      value={displayedOptions.flexOnly.gripperCalibrations}
                      label={t('clear_option_gripper_offset_calibrations')}
                    />
                    <CheckboxField
                      onChange={() => {
                        const options = cloneDeep(displayedOptions)
                        options.flexOnly.moduleCalibrations = !options.flexOnly
                          .moduleCalibrations
                        setDisplayedOptions(options)
                      }}
                      value={displayedOptions.flexOnly.moduleCalibrations}
                      label={t('clear_option_module_calibration')}
                    />
                  </>
                ) : (
                  <>
                    <CheckboxField
                      onChange={() => {
                        const options = cloneDeep(displayedOptions)
                        options.ot2Only.deckCalibration = !options.ot2Only
                          .deckCalibration
                        setDisplayedOptions(options)
                      }}
                      value={displayedOptions.ot2Only.deckCalibration}
                      label={t('clear_option_deck_calibration')}
                    />
                    <CheckboxField
                      onChange={() => {
                        const options = cloneDeep(displayedOptions)
                        options.ot2Only.tipLengthCalibrations = !options.ot2Only
                          .tipLengthCalibrations
                        setDisplayedOptions(options)
                      }}
                      value={displayedOptions.ot2Only.tipLengthCalibrations}
                      label={t('clear_option_tip_length_calibrations')}
                    />
                    <CheckboxField
                      onChange={() => {
                        const options = cloneDeep(displayedOptions)
                        options.common.pipetteOffsetCalibrations = !options
                          .common.pipetteOffsetCalibrations
                        setDisplayedOptions(options)
                      }}
                      value={displayedOptions.common.pipetteOffsetCalibrations}
                      label={t('clear_option_pipette_offset_calibrations')}
                    />
                  </>
                )}
              </Flex>
            </Box>
            <Box>
              <Flex
                flexDirection={DIRECTION_ROW}
                justifyContent={JUSTIFY_SPACE_BETWEEN}
                marginBottom={SPACING.spacing8}
              >
                <LegacyStyledText as="p" css={TYPOGRAPHY.pSemiBold}>
                  {t('protocol_run_data')}
                </LegacyStyledText>
                <Link
                  role="button"
                  css={TYPOGRAPHY.linkPSemiBold}
                  onClick={downloadRunHistoryLogs}
                >
                  {t('download')}
                </Link>
              </Flex>
              <Flex
                flexDirection={DIRECTION_COLUMN}
                gridGap={-SPACING.spacing4}
              >
                <CheckboxField
                  onChange={() => {
                    const options = cloneDeep(displayedOptions)
                    options.common.runsHistory = !options.common.runsHistory
                    setDisplayedOptions(options)
                  }}
                  value={displayedOptions.common.runsHistory}
                  label={t('clear_option_runs_history')}
                />
                <CheckboxField
                  onChange={() => {
                    const options = cloneDeep(displayedOptions)
                    options.common.labwareOffsets = !options.common
                      .labwareOffsets
                    setDisplayedOptions(options)
                  }}
                  value={displayedOptions.common.labwareOffsets}
                  label={t('clear_option_labware_offsets')}
                />
              </Flex>
            </Box>
            <Box>
              <LegacyStyledText
                as="p"
                css={TYPOGRAPHY.pSemiBold}
                marginBottom={SPACING.spacing8}
              >
                {t('boot_scripts')}
              </LegacyStyledText>
              <CheckboxField
                onChange={() => {
                  const options = cloneDeep(displayedOptions)
                  options.common.bootScripts = !options.common.bootScripts
                  setDisplayedOptions(options)
                }}
                value={displayedOptions.common.bootScripts}
                label={t('clear_option_boot_scripts')}
              />
            </Box>
            <Box>
              <LegacyStyledText
                as="p"
                css={TYPOGRAPHY.pSemiBold}
                marginBottom={SPACING.spacing8}
              >
                {t('ssh_public_keys')}
              </LegacyStyledText>
              <CheckboxField
                onChange={() => {
                  const options = cloneDeep(displayedOptions)
                  options.common.authorizedKeys = !options.common.authorizedKeys
                  setDisplayedOptions(options)
                }}
                value={displayedOptions.common.authorizedKeys}
                label={t('clear_option_authorized_keys')}
              />
            </Box>
          </Flex>
        </Flex>
      </Flex>
    </Slideout>
  )
}

// Keys in this object do not need to map to the server's HTTP API.
//
// This is `{ot2Only: ..., flexOnly: ...}`` instead of `OT2Only | FlexOnly`` to be
// defensive against the robot type changing
interface DisplayedResetOptionState {
  common: {
    runsHistory: boolean
    bootScripts: boolean
    authorizedKeys: boolean
    pipetteOffsetCalibrations: boolean
    labwareOffsets: boolean
  }
  ot2Only: {
    deckCalibration: boolean
    tipLengthCalibrations: boolean
  }
  flexOnly: {
    gripperCalibrations: boolean
    moduleCalibrations: boolean
  }
}

const ALL_DESELECTED: DisplayedResetOptionState = {
  common: {
    runsHistory: false,
    bootScripts: false,
    authorizedKeys: false,
    pipetteOffsetCalibrations: false,
    labwareOffsets: false,
  },
  ot2Only: {
    deckCalibration: false,
    tipLengthCalibrations: false,
  },
  flexOnly: {
    gripperCalibrations: false,
    moduleCalibrations: false,
  },
}

const ALL_SELECTED: DisplayedResetOptionState = {
  common: {
    runsHistory: true,
    bootScripts: true,
    authorizedKeys: true,
    pipetteOffsetCalibrations: true,
    labwareOffsets: true,
  },
  ot2Only: {
    deckCalibration: true,
    tipLengthCalibrations: true,
  },
  flexOnly: {
    gripperCalibrations: true,
    moduleCalibrations: true,
  },
}

function isAnyOptionSelected(
  displayedState: DisplayedResetOptionState,
  isFlex: boolean
): boolean {
  const common = Object.values(displayedState.common)
  const robotSpecific = Object.values(
    isFlex ? displayedState.flexOnly : displayedState.ot2Only
  )
  return [...common, ...robotSpecific].some(value => value)
}

function isEveryOptionSelected(
  displayedState: DisplayedResetOptionState,
  isFlex: boolean
): boolean {
  const common = Object.values(displayedState.common)
  const robotSpecific = Object.values(
    isFlex ? displayedState.flexOnly : displayedState.ot2Only
  )
  return [...common, ...robotSpecific].every(value => value)
}

function buildResetRequest(
  displayedState: DisplayedResetOptionState,
  serverResetOptions: ResetConfigOption[],
  isFlex: boolean
): ResetConfigRequest {
  let requestToReturn: ResetConfigRequest = {
    // Keys in this object need to follow the server's HTTP API.

    bootScripts: displayedState.common.bootScripts,
    runsHistory: displayedState.common.runsHistory,
    authorizedKeys: displayedState.common.authorizedKeys,
    pipetteOffsetCalibrations: displayedState.common.pipetteOffsetCalibrations,

    deckCalibration: displayedState.ot2Only.deckCalibration,
    tipLengthCalibrations: displayedState.ot2Only.tipLengthCalibrations,

    gripperOffsetCalibrations: displayedState.flexOnly.gripperCalibrations,
    moduleCalibration: displayedState.flexOnly.moduleCalibrations,
  }

  if (isFlex) {
    // If the user selected every option in the UI, implicitly also select any options
    // that the server advertises but that we don't show in the UI. Notably, this
    // includes onDeviceDisplay.
    if (isEveryOptionSelected(displayedState, isFlex)) {
      requestToReturn = Object.fromEntries(
        serverResetOptions.map(o => [o.id, true])
      )
    }
  }

  // If the server is older than this app, we might send it options that it doesn't
  // understand, which it could choke on. Filter to send only the options that the
  // server advertises.
  const serverResetOptionIds = serverResetOptions.map(o => o.id)
  requestToReturn = Object.fromEntries(
    Object.entries(requestToReturn).filter(([k, _v]) =>
      serverResetOptionIds.includes(k)
    )
  )

  return requestToReturn
}
