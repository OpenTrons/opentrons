import * as React from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useTranslation } from 'react-i18next'

import { Box, SPACING, IconProps } from '@opentrons/components'

import { Divider } from '../../../atoms/structure'
import { Toast } from '../../../atoms/Toast'
import { useRobot } from '../hooks'
import { DisplayRobotName } from './AdvancedTab/DisplayRobotName'
import { RobotInformation } from './AdvancedTab/RobotInformation'
import { RobotServerVersion } from './AdvancedTab/RobotServerVersion'
import { UsageSettings } from './AdvancedTab/UsageSettings'
import { DisableHoming } from './AdvancedTab/DisableHoming'
import { OpenJupyterControl } from './AdvancedTab/OpenJupyterControl'
import { UpdateRobotSoftware } from './AdvancedTab/UpdateRobotSoftware'
import { Troubleshooting } from './AdvancedTab/Troubleshooting'
import { FactoryReset } from './AdvancedTab/FactoryReset'
import { UseOlderProtocol } from './AdvancedTab/UseOlderProtocol'
import { LegacySettings } from './AdvancedTab/LegacySettings'
import { ShortTrashBin } from './AdvancedTab/ShortTrashBin'
import { UseOlderAspirateBehavior } from './AdvancedTab/UseOlderAspirateBehavior'
import { getRobotSettings, fetchSettings } from '../../../redux/robot-settings'
import { RenameRobotSlideout } from './AdvancedTab/AdvancedTabSlideouts/RenameRobotSlideout'
import { FactoryResetSlideout } from './AdvancedTab/AdvancedTabSlideouts/FactoryResetSlideout'
import { FactoryResetModal } from './AdvancedTab/AdvancedTabSlideouts/FactoryResetModal'
import { UpdateBuildroot } from './UpdateBuildroot'

import type { State, Dispatch } from '../../../redux/types'
import type {
  RobotSettings,
  RobotSettingsField,
} from '../../../redux/robot-settings/types'
import type { ResetConfigRequest } from '../../../redux/robot-admin/types'
import { UNREACHABLE } from '../../../redux/discovery'
import { Portal } from '../../../App/portal'

interface RobotSettingsAdvancedProps {
  robotName: string
  updateRobotStatus: (isRobotBusy: boolean) => void
}

export function RobotSettingsAdvanced({
  robotName,
  updateRobotStatus,
}: RobotSettingsAdvancedProps): JSX.Element {
  const { t } = useTranslation('device_settings')
  const [
    showRenameRobotSlideout,
    setShowRenameRobotSlideout,
  ] = React.useState<boolean>(false)
  const [
    showFactoryResetSlideout,
    setShowFactoryResetSlideout,
  ] = React.useState<boolean>(false)
  const [
    showFactoryResetModal,
    setShowFactoryResetModal,
  ] = React.useState<boolean>(false)
  const [
    showSoftwareUpdateModal,
    setShowSoftwareUpdateModal,
  ] = React.useState<boolean>(false)
  const [showDownloadToast, setShowDownloadToast] = React.useState<boolean>(
    false
  )

  const toastIcon: IconProps = { name: 'ot-spinner', spin: true }
  const robot = useRobot(robotName)
  const ipAddress = robot?.ip != null ? robot.ip : ''
  const settings = useSelector<State, RobotSettings>((state: State) =>
    getRobotSettings(state, robotName)
  )
  const connected = robot?.connected != null && robot.connected

  const [isRobotConnected, setIsRobotConnected] = React.useState<boolean>(
    connected
  )
  const [resetOptions, setResetOptions] = React.useState<ResetConfigRequest>({})
  const findSettings = (id: string): RobotSettingsField | undefined =>
    settings?.find(s => s.id === id)

  const updateIsExpanded = (
    isExpanded: boolean,
    type: 'factoryReset' | 'renameRobot'
  ): void => {
    if (type === 'factoryReset') {
      setShowFactoryResetSlideout(isExpanded)
    } else {
      setShowRenameRobotSlideout(isExpanded)
    }
  }

  const updateResetStatus = (
    isConnected: boolean,
    options?: ResetConfigRequest
  ): void => {
    if (options != null) setResetOptions(options)
    setShowFactoryResetModal(true)
    setIsRobotConnected(isConnected ?? false)
  }

  const updateDownloadLogsStatus = (isDownloading: boolean): void =>
    setShowDownloadToast(isDownloading)

  const updateIsRobotBusy = (isRobotBusy: boolean): void => {
    updateRobotStatus(isRobotBusy)
  }

  const dispatch = useDispatch<Dispatch>()

  React.useEffect(() => {
    dispatch(fetchSettings(robotName))
  }, [dispatch, robotName])

  return (
    <>
      {showSoftwareUpdateModal &&
      robot != null &&
      robot.status !== UNREACHABLE ? (
        <UpdateBuildroot
          robot={robot}
          close={() => setShowSoftwareUpdateModal(false)}
        />
      ) : null}
      {showDownloadToast && (
        <Toast
          message={t('update_robot_software_download_logs_toast_message')}
          type="info"
          icon={toastIcon}
          closeButton={false}
          onClose={() => setShowDownloadToast(false)}
          disableTimeout={true}
        />
      )}
      <Box>
        {showRenameRobotSlideout && (
          <RenameRobotSlideout
            isExpanded={showRenameRobotSlideout}
            onCloseClick={() => setShowRenameRobotSlideout(false)}
            robotName={robotName}
          />
        )}
        {showFactoryResetSlideout && (
          <FactoryResetSlideout
            isExpanded={showFactoryResetSlideout}
            onCloseClick={() => setShowFactoryResetSlideout(false)}
            robotName={robotName}
            updateResetStatus={updateResetStatus}
          />
        )}
        {showFactoryResetModal && (
          <Portal level="top">
            <FactoryResetModal
              closeModal={() => setShowFactoryResetModal(false)}
              isRobotConnected={isRobotConnected}
              robotName={robotName}
              resetOptions={resetOptions}
            />
          </Portal>
        )}
        <DisplayRobotName
          robotName={robotName}
          updateIsExpanded={updateIsExpanded}
          updateIsRobotBusy={updateIsRobotBusy}
        />
        <Divider marginY={SPACING.spacing4} />
        <RobotServerVersion robotName={robotName} />
        <Divider marginY={SPACING.spacing4} />
        <RobotInformation robotName={robotName} />
        <Divider marginY={SPACING.spacing4} />
        <UsageSettings
          settings={findSettings('enableDoorSafetySwitch')}
          robotName={robotName}
          updateIsRobotBusy={updateIsRobotBusy}
        />
        <Divider marginY={SPACING.spacing4} />
        <DisableHoming
          settings={findSettings('disableHomeOnBoot')}
          robotName={robotName}
          updateIsRobotBusy={updateIsRobotBusy}
        />
        <Divider marginY={SPACING.spacing4} />
        <OpenJupyterControl robotIp={ipAddress} />
        <Divider marginY={SPACING.spacing5} />
        <UpdateRobotSoftware
          robotName={robotName}
          updateIsRobotBusy={updateIsRobotBusy}
          onUpdateStart={() => setShowSoftwareUpdateModal(true)}
        />
        <Troubleshooting
          robotName={robotName}
          updateDownloadLogsStatus={updateDownloadLogsStatus}
        />
        <Divider marginY={SPACING.spacing4} />
        <FactoryReset
          updateIsExpanded={updateIsExpanded}
          updateIsRobotBusy={updateIsRobotBusy}
        />
        <Divider marginY={SPACING.spacing4} />
        <UseOlderProtocol
          settings={findSettings('disableFastProtocolUpload')}
          robotName={robotName}
          updateIsRobotBusy={updateIsRobotBusy}
        />
        <LegacySettings
          settings={findSettings('deckCalibrationDots')}
          robotName={robotName}
          updateIsRobotBusy={updateIsRobotBusy}
        />
        <Divider marginY={SPACING.spacing4} />
        <ShortTrashBin
          settings={findSettings('shortFixedTrash')}
          robotName={robotName}
          updateIsRobotBusy={updateIsRobotBusy}
        />
        <Divider marginY={SPACING.spacing4} />
        <UseOlderAspirateBehavior
          settings={findSettings('useOldAspirationFunctions')}
          robotName={robotName}
          updateIsRobotBusy={updateIsRobotBusy}
        />
      </Box>
    </>
  )
}
