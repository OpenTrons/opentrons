import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'

import {
  ALIGN_CENTER,
  BORDERS,
  COLORS,
  DIRECTION_COLUMN,
  DIRECTION_ROW,
  Flex,
  Icon,
  JUSTIFY_CENTER,
  SPACING,
  LegacyStyledText,
  TYPOGRAPHY,
} from '@opentrons/components'

import { MediumButton } from '/app/atoms/buttons'
import { RobotSetupHeader } from '/app/organisms/ODD/RobotSetupHeader'
import { getLocalRobot } from '/app/redux/discovery'
import { getNetworkInterfaces, fetchStatus } from '/app/redux/networking'
import { NetworkDetailsModal } from '../RobotSettingsDashboard/NetworkSettings/NetworkDetailsModal'

import type { WifiSecurityType } from '@opentrons/api-client'
import type { Dispatch, State } from '/app/redux/types'

interface WifiConnectionDetailsProps {
  ssid?: string
  authType?: WifiSecurityType
  showHeader?: boolean
}

export function WifiConnectionDetails({
  ssid,
  authType,
}: WifiConnectionDetailsProps): JSX.Element {
  const { i18n, t } = useTranslation(['device_settings', 'shared'])
  const navigate = useNavigate()
  const localRobot = useSelector(getLocalRobot)
  const robotName = localRobot?.name != null ? localRobot.name : 'no name'
  const dispatch = useDispatch<Dispatch>()
  const { wifi } = useSelector((state: State) =>
    getNetworkInterfaces(state, robotName)
  )

  const noData = i18n.format(t('shared:no_data'), 'titleCase')
  const ipAddress = wifi?.ipAddress != null ? wifi.ipAddress : noData
  const subnetMask = wifi?.subnetMask != null ? wifi.subnetMask : noData
  const macAddress = wifi?.macAddress != null ? wifi.macAddress : noData

  const [
    showNetworkDetailsModal,
    setShowNetworkDetailsModal,
  ] = useState<boolean>(false)

  useEffect(() => {
    dispatch(fetchStatus(robotName))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      {showNetworkDetailsModal ? (
        <NetworkDetailsModal
          ssid={ssid}
          setShowNetworkDetailModal={setShowNetworkDetailsModal}
          ipAddress={ipAddress}
          subnetMask={subnetMask}
          macAddress={macAddress}
          securityType={authType}
        />
      ) : null}
      <Flex flexDirection={DIRECTION_COLUMN} flex="1">
        <RobotSetupHeader header={t('wifi')} />
        <Flex
          flex="1"
          flexDirection={DIRECTION_COLUMN}
          gridGap={SPACING.spacing32}
          padding={SPACING.spacing40}
          paddingTop={SPACING.spacing32}
        >
          <DisplayConnectionStatus ssid={ssid} />
          <Flex flexDirection={DIRECTION_ROW} gridGap={SPACING.spacing8}>
            <MediumButton
              flex="1"
              buttonType="secondary"
              buttonText={t('view_network_details')}
              onClick={() => {
                setShowNetworkDetailsModal(true)
              }}
            />
            <MediumButton
              flex="1"
              buttonText={i18n.format(t('shared:continue'), 'capitalize')}
              onClick={() => {
                navigate('/robot-settings/update-robot-during-onboarding')
              }}
            />
          </Flex>
        </Flex>
      </Flex>
    </>
  )
}

interface DisplayConnectionStatusProps {
  ssid?: string
}

const DisplayConnectionStatus = ({
  ssid,
}: DisplayConnectionStatusProps): JSX.Element => {
  const { t } = useTranslation('device_settings')
  return (
    <Flex
      flex="1"
      flexDirection={DIRECTION_COLUMN}
      gridGap={SPACING.spacing32}
      backgroundColor={COLORS.green35}
      borderRadius={BORDERS.borderRadius12}
      alignItems={ALIGN_CENTER}
      justifyContent={JUSTIFY_CENTER}
    >
      <Icon size="3rem" name="ot-check" color={COLORS.green50} />
      <LegacyStyledText as="h3" fontWeight={TYPOGRAPHY.fontWeightSemiBold}>
        {t('successfully_connected_to_network', { ssid })}
      </LegacyStyledText>
    </Flex>
  )
}
