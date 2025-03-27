import { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useTranslation } from 'react-i18next'
import snakeCase from 'lodash/snakeCase'

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
  const [resetOptions, setResetOptions] = useState<ResetConfigRequest>({})
  const runsQueryResponse = useNotifyAllRunsQuery()
  const isFlex = useIsFlex(robotName)

  // Calibration data
  const deckCalibrationData = useDeckCalibrationData(robotName)
  const pipetteOffsetCalibrations = usePipetteOffsetCalibrations()
  const tipLengthCalibrations = useTipLengthCalibrations()
  const options = useSelector((state: State) =>
    getResetConfigOptions(state, robotName)
  )
  // Check length>0 to cope with the current behavior of getResetConfigOptions.
  // Perhaps it should return null instead of [] if we don't have options loaded yet.
  const areOptionsLoaded = options != null && Object.keys(options).length > 0

  const ot2CalibrationOptions =
    options != null ? options.filter(opt => opt.id.includes('Calibration')) : []
  const flexCalibrationOptions =
    options != null
      ? options.filter(
          opt =>
            opt.id === 'pipetteOffsetCalibrations' ||
            opt.id === 'gripperOffsetCalibrations' ||
            opt.id === 'moduleCalibration'
        )
      : []

  const calibrationOptions = isFlex
    ? flexCalibrationOptions
    : ot2CalibrationOptions

  const bootScriptOption =
    options != null ? options.filter(opt => opt.id.includes('bootScript')) : []
  const runHistoryOption =
    options != null ? options.filter(opt => opt.id.includes('runsHistory')) : []
  const sshKeyOption =
    options != null
      ? options.filter(opt => opt.id.includes('authorizedKeys'))
      : []

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
      buildResetRequest(resetOptions, options, isFlex)
    )
    onCloseClick()
  }

  const totalOptionsSelected = Object.values(resetOptions).filter(
    selected => selected === true
  ).length

  // filtering out ODD setting because this gets implicitly cleared if all settings are selected
  const allOptionsWithoutODD =
    options != null ? options.filter(o => o.id !== 'onDeviceDisplay') : []

  const isEveryOptionSelected =
    totalOptionsSelected > 0 &&
    totalOptionsSelected === allOptionsWithoutODD.length

  return (
    <Slideout
      title={t('device_reset')}
      onCloseClick={onCloseClick}
      isExpanded={isExpanded}
      footer={
        <PrimaryButton
          disabled={
            !(Object.values(resetOptions).find(val => val) ?? false) ||
            // handleClearData assumes options are loaded.
            !areOptionsLoaded
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
                    setResetOptions(
                      isEveryOptionSelected
                        ? {}
                        : allOptionsWithoutODD.reduce((acc, val) => {
                            return {
                              ...acc,
                              [val.id]: true,
                            }
                          }, {})
                    )
                  }}
                  value={isEveryOptionSelected}
                  label={t(`select_all_settings`)}
                  isIndeterminate={
                    !isEveryOptionSelected && totalOptionsSelected > 0
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
                {calibrationOptions.map(opt => {
                  let calibrationName = ''
                  if (opt.id === 'pipetteOffsetCalibrations') {
                    calibrationName = isFlex
                      ? t('clear_option_pipette_calibrations')
                      : t(`clear_option_${snakeCase(opt.id)}`)
                  } else {
                    calibrationName = t(`clear_option_${snakeCase(opt.id)}`)
                  }
                  return (
                    calibrationName !== '' && (
                      <CheckboxField
                        key={opt.id}
                        onChange={() => {
                          setResetOptions({
                            ...resetOptions,
                            [opt.id]: !(resetOptions[opt.id] ?? false),
                          })
                        }}
                        value={resetOptions[opt.id]}
                        label={calibrationName}
                      />
                    )
                  )
                })}
              </Flex>
            </Box>
            <Box>
              <Flex
                flexDirection={DIRECTION_ROW}
                justifyContent={JUSTIFY_SPACE_BETWEEN}
                marginBottom={SPACING.spacing8}
              >
                <LegacyStyledText as="p" css={TYPOGRAPHY.pSemiBold}>
                  {t('protocol_run_history')}
                </LegacyStyledText>
                <Link
                  role="button"
                  css={TYPOGRAPHY.linkPSemiBold}
                  onClick={downloadRunHistoryLogs}
                >
                  {t('download')}
                </Link>
              </Flex>
              {runHistoryOption.map(opt => (
                <CheckboxField
                  key={opt.id}
                  onChange={() => {
                    setResetOptions({
                      ...resetOptions,
                      [opt.id]: !(resetOptions[opt.id] ?? false),
                    })
                  }}
                  value={resetOptions[opt.id]}
                  label={t(`clear_option_${snakeCase(opt.id)}`)}
                />
              ))}
            </Box>
            <Box>
              <LegacyStyledText
                as="p"
                css={TYPOGRAPHY.pSemiBold}
                marginBottom={SPACING.spacing8}
              >
                {t('boot_scripts')}
              </LegacyStyledText>
              {bootScriptOption.map(opt => (
                <CheckboxField
                  key={opt.id}
                  onChange={() => {
                    setResetOptions({
                      ...resetOptions,
                      [opt.id]: !(resetOptions[opt.id] ?? false),
                    })
                  }}
                  value={resetOptions[opt.id]}
                  label={t(`clear_option_${snakeCase(opt.id)}`)}
                />
              ))}
            </Box>
            <Box>
              <LegacyStyledText
                as="p"
                css={TYPOGRAPHY.pSemiBold}
                marginBottom={SPACING.spacing8}
              >
                {t('ssh_public_keys')}
              </LegacyStyledText>
              {sshKeyOption.map(opt => (
                <CheckboxField
                  key={opt.id}
                  onChange={() => {
                    setResetOptions({
                      ...resetOptions,
                      [opt.id]: !(resetOptions[opt.id] ?? false),
                    })
                  }}
                  value={resetOptions[opt.id]}
                  label={t(`clear_option_${snakeCase(opt.id)}`)}
                />
              ))}
            </Box>
          </Flex>
        </Flex>
      </Flex>
    </Slideout>
  )
}

function buildResetRequest(
  displayedState: ResetConfigRequest,
  serverResetOptions: ResetConfigOption[],
  isFlex: boolean
): ResetConfigRequest {
  let requestToReturn = {
    ...displayedState,
  }

  if (isFlex) {
    // todo(mm, 2025-03-27): This logic for auto-selecting the onDeviceDisplay reset
    // option will not work if we add a new server-side option to
    // `GET /settings/reset/options` but leave it out of the UI.
    // (onDeviceDisplay will never be selected then.) We probably want to base
    // `isEveryOptionSelected` on what the UI actually lets the user select, not
    // what the server theoretically accepts.

    const isEveryOptionSelected = serverResetOptions
      .filter(o => o.id !== 'onDeviceDisplay') // filtering out ODD setting because this gets implicitly cleared if all settings are selected
      .map(serverOption => requestToReturn?.[serverOption.id] ?? false)
      .every(value => value)

    if (isEveryOptionSelected) {
      requestToReturn = {
        ...requestToReturn,
        onDeviceDisplay: true,
      }
    }
  }

  return requestToReturn
}
