import * as React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { css } from 'styled-components'
import { Link } from 'react-router-dom'

import {
  Flex,
  DIRECTION_COLUMN,
  SPACING,
  COLORS,
  Btn,
  Icon,
  DIRECTION_ROW,
  JUSTIFY_SPACE_BETWEEN,
  ALIGN_CENTER,
  ALIGN_FLEX_START,
  JUSTIFY_CENTER,
  TYPOGRAPHY,
  BORDERS,
  ALIGN_FLEX_END,
  DISPLAY_FLEX,
} from '@opentrons/components'

import { StyledText } from '../../atoms/text'
import { TertiaryButton } from '../../atoms/buttons'
import { getLocalRobot, getRobotApiVersion } from '../../redux/discovery'
import { getBuildrootUpdateAvailable } from '../../redux/buildroot'
import { getDevtoolsEnabled, toggleDevtools } from '../../redux/config'
import { UNREACHABLE } from '../../redux/discovery/constants'
import { Navigation } from '../../organisms/OnDeviceDisplay/Navigation'
import { useLights } from '../../organisms/Devices/hooks'
import { onDeviceDisplayRoutes } from '../../App/OnDeviceDisplayApp'
import { useNetworkConnection } from './hooks'
import {
  DeviceReset,
  TouchscreenBrightness,
  TouchScreenSleep,
  TextSize,
  NetworkSettings,
  RobotName,
  RobotSystemVersion,
  UpdateChannel,
} from '../../organisms/OnDeviceDisplay/RobotSettingsDashboard'

import type { IconName } from '@opentrons/components'
import type { NetworkConnection } from './hooks'
import type { Dispatch, State } from '../../redux/types'

const SETTING_BUTTON_STYLE = css`
  width: 100%;
  margin-bottom: ${SPACING.spacing8};
  background-color: ${COLORS.medGreyEnabled};
  padding: ${SPACING.spacingM} ${SPACING.spacing5};
  border-radius: ${BORDERS.size_four};
`
export type SettingOption =
  | 'NetworkSettings'
  | 'RobotName'
  | 'RobotSystemVersion'
  | 'TouchscreenSleep'
  | 'TouchscreenBrightness'
  | 'TextSize'
  | 'DeviceReset'
  | 'UpdateChannel'

export function RobotSettingsDashboard(): JSX.Element {
  const { t } = useTranslation(['device_settings', 'app_settings'])
  const localRobot = useSelector(getLocalRobot)
  const robotName = localRobot?.name != null ? localRobot.name : 'no name'
  const networkConnection = useNetworkConnection(robotName)
  const [
    currentOption,
    setCurrentOption,
  ] = React.useState<SettingOption | null>(null)
  const robotServerVersion =
    localRobot?.status != null ? getRobotApiVersion(localRobot) : null

  const robotUpdateType = useSelector((state: State) => {
    return localRobot != null && localRobot.status !== UNREACHABLE
      ? getBuildrootUpdateAvailable(state, localRobot)
      : null
  })
  const isUpdateAvailable = robotUpdateType === 'upgrade'
  const devToolsOn = useSelector(getDevtoolsEnabled)
  const { lightsOn, toggleLights } = useLights()

  return (
    // This top level Flexbox only exists to position the temporary
    // "To ODD Menu" button on the bottom. When it goes, so can this.
    <Flex
      flexDirection={DIRECTION_COLUMN}
      paddingX={SPACING.spacing40}
      columnGap={SPACING.spacing8}
    >
      {currentOption != null ? (
        <Flex flexDirection={DIRECTION_COLUMN} columnGap={SPACING.spacing8}>
          <SettingsContent
            currentOption={currentOption}
            setCurrentOption={setCurrentOption}
            networkConnection={networkConnection}
            robotName={robotName}
            robotServerVersion={robotServerVersion ?? 'Unknown'}
            isUpdateAvailable={isUpdateAvailable}
            devToolsOn={devToolsOn}
          />
        </Flex>
      ) : (
        <Flex flexDirection={DIRECTION_COLUMN}>
          <Navigation routes={onDeviceDisplayRoutes} />

          {/* Network Settings */}
          <RobotSettingButton
            settingName={t('network_settings')}
            settingInfo={networkConnection?.connectionStatus}
            currentOption="NetworkSettings"
            setCurrentOption={setCurrentOption}
            iconName="wifi"
          />

          {/* Robot Name */}
          <RobotSettingButton
            settingName={t('robot_name')}
            settingInfo={robotName}
            currentOption="RobotName"
            setCurrentOption={setCurrentOption}
            iconName="flex-robot"
          />

          {/* Robot System Version */}
          <RobotSettingButton
            settingName={t('robot_system_version')}
            settingInfo={
              robotServerVersion != null
                ? `v${robotServerVersion}`
                : t('robot_settings_advanced_unknown')
            }
            currentOption="RobotSystemVersion"
            setCurrentOption={setCurrentOption}
            isUpdateAvailable={isUpdateAvailable}
            iconName="update"
          />

          {/* Display LED Lights */}
          <RobotSettingButton
            settingName={t('display_led_lights')}
            settingInfo={t('display_led_lights_description')}
            setCurrentOption={setCurrentOption}
            iconName="light"
            ledLights
            lightsOn={Boolean(lightsOn)}
            toggleLights={toggleLights}
          />

          {/* Touchscreen Sleep */}
          <RobotSettingButton
            settingName={t('touchscreen_sleep')}
            currentOption="TouchscreenSleep"
            setCurrentOption={setCurrentOption}
            iconName="sleep"
          />

          {/* Touchscreen Brightness */}
          <RobotSettingButton
            settingName={t('touchscreen_brightness')}
            currentOption="TouchscreenBrightness"
            setCurrentOption={setCurrentOption}
            iconName="brightness"
          />

          {/* Text Size */}
          <RobotSettingButton
            settingName={t('text_size')}
            currentOption="TextSize"
            setCurrentOption={setCurrentOption}
            iconName="text-size"
          />

          {/* Device Reset */}
          <RobotSettingButton
            settingName={t('device_reset')}
            currentOption="DeviceReset"
            setCurrentOption={setCurrentOption}
            iconName="reset"
          />
          {/* Update Channel */}
          <RobotSettingButton
            settingName={t('app_settings:update_channel')}
            currentOption="UpdateChannel"
            setCurrentOption={setCurrentOption}
            iconName="update-channel"
          />
          {/* Enable Developer Tools */}
          <RobotSettingButton
            settingName={t('app_settings:enable_dev_tools')}
            settingInfo={t('dev_tools_description')}
            iconName="build"
            enabledDevTools
            devToolsOn={devToolsOn}
          />
        </Flex>
      )}
      <Flex
        alignSelf={ALIGN_FLEX_END}
        padding={SPACING.spacing40}
        width="fit-content"
      >
        <Link to="menu">
          <TertiaryButton>To ODD Menu</TertiaryButton>
        </Link>
      </Flex>
    </Flex>
  )
}

interface RobotSettingButtonProps {
  settingName: string
  iconName: IconName
  settingInfo?: string
  currentOption?: SettingOption
  setCurrentOption?: (currentOption: SettingOption) => void
  robotName?: string
  isUpdateAvailable?: boolean
  enabledDevTools?: boolean
  devToolsOn?: boolean
  ledLights?: boolean
  lightsOn?: boolean
  toggleLights?: () => void
}

const RobotSettingButton = ({
  settingName,
  settingInfo,
  currentOption,
  setCurrentOption,
  isUpdateAvailable,
  iconName,
  enabledDevTools,
  devToolsOn,
  ledLights,
  lightsOn,
  toggleLights,
}: RobotSettingButtonProps): JSX.Element => {
  const { t } = useTranslation(['app_settings', 'shared'])
  const dispatch = useDispatch<Dispatch>()

  const handleClick = (): void => {
    if (currentOption != null && setCurrentOption != null) {
      setCurrentOption(currentOption)
    } else if (Boolean(enabledDevTools)) {
      dispatch(toggleDevtools())
    } else if (Boolean(ledLights)) {
      if (toggleLights != null) toggleLights()
    }
  }

  return (
    <Btn
      css={SETTING_BUTTON_STYLE}
      onClick={handleClick}
      display={DISPLAY_FLEX}
      flexDirection={DIRECTION_ROW}
      gridGap={SPACING.spacing24}
      justifyContent={JUSTIFY_SPACE_BETWEEN}
      alignItems={ALIGN_CENTER}
    >
      <Flex
        flexDirection={DIRECTION_ROW}
        gridGap={SPACING.spacing24}
        alignItems={ALIGN_CENTER}
      >
        <Icon name={iconName} size="3rem" />
        <Flex
          flexDirection={DIRECTION_COLUMN}
          gridGap={SPACING.spacing2}
          alignItems={ALIGN_FLEX_START}
          justifyContent={JUSTIFY_CENTER}
        >
          <StyledText as="h4" fontWeight={TYPOGRAPHY.fontWeightSemiBold}>
            {settingName}
          </StyledText>
          {settingInfo != null ? (
            <StyledText
              color={COLORS.darkGreyEnabled}
              as="h4"
              fontWeight={TYPOGRAPHY.fontWeightRegular}
              textAlign={TYPOGRAPHY.textAlignLeft}
            >
              {settingInfo}
            </StyledText>
          ) : null}
        </Flex>
      </Flex>
      {isUpdateAvailable ?? false ? (
        <Flex
          flexDirection={DIRECTION_ROW}
          gridGap="0.75rem"
          alignItems={ALIGN_CENTER}
          backgroundColor={COLORS.warningBackgroundMed}
          padding={`0.75rem ${SPACING.spacing4}`}
          borderRadius={BORDERS.size_four}
        >
          <Icon name="ot-alert" size="1.75rem" color={COLORS.warningEnabled} />
          <StyledText as="p" fontWeight={TYPOGRAPHY.fontWeightSemiBold}>
            {t('update_available')}
          </StyledText>
        </Flex>
      ) : null}

      {enabledDevTools != null ? (
        <Flex
          flexDirection={DIRECTION_ROW}
          gridGap="0.75rem"
          alignItems={ALIGN_CENTER}
          backgroundColor={COLORS.transparent}
          padding={`0.75rem ${SPACING.spacing4}`}
          borderRadius={BORDERS.size_four}
        >
          <StyledText as="h4" fontWeight={TYPOGRAPHY.fontWeightRegular}>
            {Boolean(devToolsOn) ? t('shared:on') : t('shared:off')}
          </StyledText>
        </Flex>
      ) : null}

      {ledLights != null ? (
        <Flex
          flexDirection={DIRECTION_ROW}
          gridGap="0.75rem"
          alignItems={ALIGN_CENTER}
          backgroundColor={COLORS.transparent}
          padding={`0.75rem ${SPACING.spacing4}`}
          borderRadius={BORDERS.size_four}
        >
          <StyledText as="h4" fontWeight={TYPOGRAPHY.fontWeightRegular}>
            {Boolean(lightsOn) ? t('shared:on') : t('shared:off')}
          </StyledText>
        </Flex>
      ) : null}

      {enabledDevTools == null && ledLights == null ? (
        <Icon name="chevron-right" size="3rem" />
      ) : null}
    </Btn>
  )
}

interface SettingsContentProps {
  currentOption: SettingOption
  setCurrentOption: (currentOption: SettingOption | null) => void
  networkConnection: NetworkConnection
  robotName: string
  robotServerVersion: string
  isUpdateAvailable: boolean
  devToolsOn: boolean
}
function SettingsContent({
  currentOption,
  setCurrentOption,
  networkConnection,
  robotName,
  robotServerVersion,
  isUpdateAvailable,
  devToolsOn,
}: SettingsContentProps): JSX.Element {
  switch (currentOption) {
    case 'RobotName':
      return <RobotName setCurrentOption={setCurrentOption} />
    case 'RobotSystemVersion':
      return (
        <RobotSystemVersion
          currentVersion={robotServerVersion}
          isUpdateAvailable={isUpdateAvailable}
          setCurrentOption={setCurrentOption}
        />
      )
    case 'NetworkSettings':
      return (
        <NetworkSettings
          networkConnection={networkConnection}
          setCurrentOption={setCurrentOption}
        />
      )
    case 'TouchscreenSleep':
      return <TouchScreenSleep setCurrentOption={setCurrentOption} />
    case 'TouchscreenBrightness':
      return <TouchscreenBrightness setCurrentOption={setCurrentOption} />
    case 'TextSize':
      return <TextSize setCurrentOption={setCurrentOption} />
    case 'DeviceReset':
      return (
        <DeviceReset
          robotName={robotName}
          setCurrentOption={setCurrentOption}
        />
      )
    case 'UpdateChannel':
      return (
        <UpdateChannel
          setCurrentOption={setCurrentOption}
          devToolsOn={devToolsOn}
        />
      )
  }
}
