import * as React from 'react'
import { createPortal } from 'react-dom'
import { useSelector, useDispatch } from 'react-redux'

import {
  Box,
  SPACING,
  Flex,
  ALIGN_CENTER,
  JUSTIFY_SPACE_BETWEEN,
  TYPOGRAPHY,
} from '@opentrons/components'

import { Divider } from '../../../atoms/structure'
import { StyledText } from '../../../atoms/text'
import { ToggleButton } from '../../../atoms/buttons'
import { useIsFlex, useIsRobotBusy, useRobot } from '../hooks'
import {
  DeviceReset,
  DisplayRobotName,
  EnableStatusLight,
  GantryHoming,
  LegacySettings,
  OpenJupyterControl,
  RobotInformation,
  RobotServerVersion,
  ShortTrashBin,
  Troubleshooting,
  UpdateRobotSoftware,
  UsageSettings,
  UseOlderAspirateBehavior,
  UseOlderProtocol,
} from './AdvancedTab'
import {
  updateSetting,
  getRobotSettings,
  fetchSettings,
} from '../../../redux/robot-settings'
import { RenameRobotSlideout } from './AdvancedTab/AdvancedTabSlideouts/RenameRobotSlideout'
import { DeviceResetSlideout } from './AdvancedTab/AdvancedTabSlideouts/DeviceResetSlideout'
import { DeviceResetModal } from './AdvancedTab/AdvancedTabSlideouts/DeviceResetModal'
import { handleUpdateBuildroot } from './UpdateBuildroot'
import { UNREACHABLE } from '../../../redux/discovery'
import { getTopPortalEl } from '../../../App/portal'
import { useIsEstopNotDisengaged } from '../../../resources/devices/hooks/useIsEstopNotDisengaged'

import type { State, Dispatch } from '../../../redux/types'
import type {
  RobotSettings,
  RobotSettingsField,
} from '../../../redux/robot-settings/types'
import type { ResetConfigRequest } from '../../../redux/robot-admin/types'

interface RobotSettingsAdvancedProps {
  robotName: string
  updateRobotStatus: (isRobotBusy: boolean) => void
}

export function RobotSettingsAdvanced({
  robotName,
  updateRobotStatus,
}: RobotSettingsAdvancedProps): JSX.Element {
  const [
    showRenameRobotSlideout,
    setShowRenameRobotSlideout,
  ] = React.useState<boolean>(false)
  const [
    showDeviceResetSlideout,
    setShowDeviceResetSlideout,
  ] = React.useState<boolean>(false)
  const [
    showDeviceResetModal,
    setShowDeviceResetModal,
  ] = React.useState<boolean>(false)

  const isRobotBusy = useIsRobotBusy({ poll: true })
  const isEstopNotDisengaged = useIsEstopNotDisengaged(robotName)

  const robot = useRobot(robotName)
  const isFlex = useIsFlex(robotName)
  const ipAddress = robot?.ip != null ? robot.ip : ''
  const settings = useSelector<State, RobotSettings>((state: State) =>
    getRobotSettings(state, robotName)
  )
  const reachable = robot?.status !== UNREACHABLE

  const [isRobotReachable, setIsRobotReachable] = React.useState<boolean>(
    reachable
  )
  const [resetOptions, setResetOptions] = React.useState<ResetConfigRequest>({})
  const findSettings = (id: string): RobotSettingsField | undefined =>
    settings?.find(s => s.id === id)

  const updateIsExpanded = (
    isExpanded: boolean,
    type: 'deviceReset' | 'renameRobot'
  ): void => {
    if (type === 'deviceReset') {
      setShowDeviceResetSlideout(isExpanded)
    } else {
      setShowRenameRobotSlideout(isExpanded)
    }
  }

  const updateResetStatus = (
    isReachable: boolean,
    options?: ResetConfigRequest
  ): void => {
    if (options != null) setResetOptions(options)
    setShowDeviceResetModal(true)
    setIsRobotReachable(isReachable ?? false)
  }

  const dispatch = useDispatch<Dispatch>()

  React.useEffect(() => {
    dispatch(fetchSettings(robotName))
  }, [dispatch, robotName])

  React.useEffect(() => {
    updateRobotStatus(isRobotBusy)
  }, [isRobotBusy, updateRobotStatus])

  return (
    <>
      <Box>
        {showRenameRobotSlideout && (
          <RenameRobotSlideout
            isExpanded={showRenameRobotSlideout}
            onCloseClick={() => setShowRenameRobotSlideout(false)}
            robotName={robotName}
          />
        )}
        {showDeviceResetSlideout && (
          <DeviceResetSlideout
            isExpanded={showDeviceResetSlideout}
            onCloseClick={() => setShowDeviceResetSlideout(false)}
            robotName={robotName}
            updateResetStatus={updateResetStatus}
          />
        )}
        {showDeviceResetModal &&
          createPortal(
            <DeviceResetModal
              closeModal={() => setShowDeviceResetModal(false)}
              isRobotReachable={isRobotReachable}
              robotName={robotName}
              resetOptions={resetOptions}
            />,
            getTopPortalEl()
          )}
        <DisplayRobotName
          robotName={robotName}
          updateIsExpanded={updateIsExpanded}
          isRobotBusy={isRobotBusy || isEstopNotDisengaged}
        />
        <Divider marginY={SPACING.spacing16} />
        <RobotServerVersion robotName={robotName} />
        <Divider marginY={SPACING.spacing16} />
        <RobotInformation robotName={robotName} />
        {isFlex ? null : (
          <>
            <Divider marginY={SPACING.spacing16} />
            <UsageSettings
              settings={findSettings('enableDoorSafetySwitch')}
              robotName={robotName}
              isRobotBusy={isRobotBusy || isEstopNotDisengaged}
            />
          </>
        )}
        <Divider marginY={SPACING.spacing16} />
        <GantryHoming
          settings={findSettings('disableHomeOnBoot')}
          robotName={robotName}
          isRobotBusy={isRobotBusy || isEstopNotDisengaged}
        />

        {isFlex ? (
          <>
            <Divider marginY={SPACING.spacing16} />
            <EnableStatusLight
              robotName={robotName}
              isEstopNotDisengaged={isEstopNotDisengaged}
            />
          </>
        ) : null}
        <Divider marginY={SPACING.spacing16} />
        <OpenJupyterControl
          robotIp={ipAddress}
          isEstopNotDisengaged={isEstopNotDisengaged}
        />
        <Divider marginY={SPACING.spacing16} />
        <UpdateRobotSoftware
          robotName={robotName}
          isRobotBusy={isRobotBusy || isEstopNotDisengaged}
          onUpdateStart={() => handleUpdateBuildroot(robot)}
        />
        <Troubleshooting
          robotName={robotName}
          isEstopNotDisengaged={isEstopNotDisengaged}
        />
        <Divider marginY={SPACING.spacing16} />
        <DeviceReset
          updateIsExpanded={updateIsExpanded}
          isRobotBusy={isRobotBusy || isEstopNotDisengaged}
        />
        {isFlex ? null : (
          <>
            <Divider marginY={SPACING.spacing16} />
            <UseOlderProtocol
              settings={findSettings('disableFastProtocolUpload')}
              robotName={robotName}
              isRobotBusy={isRobotBusy || isEstopNotDisengaged}
            />
            <Divider marginY={SPACING.spacing16} />
            <LegacySettings
              settings={findSettings('deckCalibrationDots')}
              robotName={robotName}
              isRobotBusy={isRobotBusy || isEstopNotDisengaged}
            />
            <Divider marginY={SPACING.spacing16} />
            <ShortTrashBin
              settings={findSettings('shortFixedTrash')}
              robotName={robotName}
              isRobotBusy={isRobotBusy || isEstopNotDisengaged}
            />
            <Divider marginY={SPACING.spacing16} />
            <UseOlderAspirateBehavior
              settings={findSettings('useOldAspirationFunctions')}
              robotName={robotName}
              isRobotBusy={isRobotBusy || isEstopNotDisengaged}
            />
          </>
        )}
      </Box>
    </>
  )
}

interface FeatureFlagToggleProps {
  settingField: RobotSettingsField
  robotName: string
  isRobotBusy: boolean
}

export function FeatureFlagToggle({
  settingField,
  robotName,
  isRobotBusy,
}: FeatureFlagToggleProps): JSX.Element | null {
  const dispatch = useDispatch<Dispatch>()
  const { value, id, title, description } = settingField

  if (id == null) return null

  const handleClick: React.MouseEventHandler<Element> = () => {
    if (!isRobotBusy) {
      dispatch(updateSetting(robotName, id, !value))
    }
  }

  return (
    <Flex
      alignItems={ALIGN_CENTER}
      justifyContent={JUSTIFY_SPACE_BETWEEN}
      marginBottom={SPACING.spacing16}
    >
      <Box width="70%">
        <StyledText css={TYPOGRAPHY.pSemiBold} paddingBottom={SPACING.spacing4}>
          {title}
        </StyledText>
        <StyledText as="p">{description}</StyledText>
      </Box>
      <ToggleButton
        label={title}
        toggledOn={value === true}
        onClick={handleClick}
        disabled={isRobotBusy}
      />
    </Flex>
  )
}
