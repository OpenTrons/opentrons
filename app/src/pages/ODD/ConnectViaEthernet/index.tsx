import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector, useDispatch } from 'react-redux'

import {
  Flex,
  SPACING,
  useInterval,
  DIRECTION_COLUMN,
} from '@opentrons/components'

import { StepMeter } from '/app/atoms/StepMeter'
import { NetworkDetailsModal } from '/app/organisms/ODD/RobotSettingsDashboard/NetworkSettings/NetworkDetailsModal'
import { getNetworkInterfaces, fetchStatus } from '/app/redux/networking'
import { getLocalRobot } from '/app/redux/discovery'
import { TitleHeader } from './TitleHeader'
import { DisplayConnectionStatus } from './DisplayConnectionStatus'

import type { State, Dispatch } from '/app/redux/types'

const STATUS_REFRESH_MS = 5000

export function ConnectViaEthernet(): JSX.Element {
  const { t } = useTranslation(['device_settings', 'shared'])
  const localRobot = useSelector(getLocalRobot)
  const robotName = localRobot?.name != null ? localRobot.name : 'no name'
  const dispatch = useDispatch<Dispatch>()
  const [
    showNetworkDetailsModal,
    setShowNetworkDetailsModal,
  ] = useState<boolean>(false)

  const { ethernet } = useSelector((state: State) =>
    getNetworkInterfaces(state, robotName)
  )
  const ipAddress =
    ethernet?.ipAddress != null ? ethernet.ipAddress : t('shared:no_data')
  const subnetMask =
    ethernet?.subnetMask != null ? ethernet.subnetMask : t('shared:no_data')
  const macAddress =
    ethernet?.macAddress != null ? ethernet.macAddress : t('shared:no_data')
  const headerTitle = t('ethernet')
  const isConnected =
    ipAddress !== t('shared:no_data') && subnetMask !== t('shared:no_data')

  useInterval(() => dispatch(fetchStatus(robotName)), STATUS_REFRESH_MS, true)

  return (
    <>
      <StepMeter totalSteps={6} currentStep={2} />
      <Flex
        margin={`${SPACING.spacing32} ${SPACING.spacing40} ${SPACING.spacing40}`}
        flexDirection={DIRECTION_COLUMN}
        gridGap={SPACING.spacing24}
      >
        <TitleHeader title={headerTitle} />
        {showNetworkDetailsModal ? (
          <NetworkDetailsModal
            setShowNetworkDetailModal={setShowNetworkDetailsModal}
            ipAddress={ipAddress}
            subnetMask={subnetMask}
            macAddress={macAddress}
          />
        ) : null}
        <DisplayConnectionStatus
          isConnected={isConnected}
          setShowNetworkDetailsModal={setShowNetworkDetailsModal}
        />
      </Flex>
    </>
  )
}
