import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { useHistory } from 'react-router-dom'
import { css } from 'styled-components'

import {
  Flex,
  SPACING,
  DIRECTION_ROW,
  ALIGN_CENTER,
  JUSTIFY_SPACE_BETWEEN,
  Icon,
  Btn,
  JUSTIFY_START,
  JUSTIFY_CENTER,
  JUSTIFY_END,
  COLORS,
  BORDERS,
} from '@opentrons/components'

import { StyledText } from '../../../atoms/text'
import { SearchNetwork } from './SearchNetwork'
import {
  CONNECT,
  JOIN_OTHER,
} from '../../Devices/RobotSettings/ConnectNetwork/constants'

import type { WifiNetwork } from '../../../redux/networking/types'
import type { NetworkChangeState } from '../../Devices/RobotSettings/ConnectNetwork/types'

const NETWORK_ROW_STYLE = css`
  &:active {
    background-color: ${COLORS.blueEnabled};
    color: ${COLORS.white};
  }
  &:hover {
    background-color: ${COLORS.blueEnabled};
    color: ${COLORS.white};
    svg {
      color: ${COLORS.white};
    }
  }
  svg {
    color: ${COLORS.darkGreyEnabled};
  }
`

interface DisplayWifiListProps {
  list: WifiNetwork[]
  isSearching: boolean
  setShowSelectAuthenticationType: (
    isShowSelectAuthenticationType: boolean
  ) => void
  setChangeState: (changeState: NetworkChangeState) => void
  setSelectedSsid: (selectedSsid: string) => void
}

export function DisplayWifiList({
  list,
  isSearching,
  setShowSelectAuthenticationType,
  setChangeState,
  setSelectedSsid,
}: DisplayWifiListProps): JSX.Element {
  const { t } = useTranslation('device_settings')
  const handleClick = (nw: WifiNetwork): void => {
    setShowSelectAuthenticationType(true)
    setSelectedSsid(nw.ssid)
    setChangeState({ type: CONNECT, ssid: nw.ssid, network: nw })
  }

  return (
    <>
      <HeaderWithIPs isSearching={isSearching} />
      {list != null && list.length > 0 ? (
        list.map(nw => (
          <Btn
            width="59rem"
            height="4rem"
            key={nw.ssid}
            backgroundColor="#d6d6d6"
            marginBottom={SPACING.spacing8}
            borderRadius={BORDERS.size3}
            css={NETWORK_ROW_STYLE}
            onClick={() => handleClick(nw)}
          >
            <Flex
              flexDirection={DIRECTION_ROW}
              padding={SPACING.spacing16}
              alignItems={ALIGN_CENTER}
            >
              <Icon name="wifi" size="2.25rem" />
              <StyledText
                marginLeft={SPACING.spacing16}
                fontSize="1.5rem"
                lineHeight="2.0625rem"
                fontWeight="400"
              >
                {nw.ssid}
              </StyledText>
            </Flex>
          </Btn>
        ))
      ) : (
        <SearchNetwork />
      )}
      <Btn
        onClick={() => setChangeState({ type: JOIN_OTHER, ssid: null })}
        marginTop={SPACING.spacing8}
        height="4rem"
        backgroundColor="#d6d6d6"
        borderRadius={BORDERS.size3}
        color={COLORS.black}
        css={NETWORK_ROW_STYLE}
      >
        <Flex
          padding={SPACING.spacing16}
          flexDirection={DIRECTION_ROW}
          alignItems={ALIGN_CENTER}
        >
          <Icon name="plus" size="2.25rem" color={COLORS.darkGreyEnabled} />
          <StyledText
            marginLeft={SPACING.spacing12}
            fontSize="1.5rem"
            lineHeight="1.8125rem"
            fontWeight="400"
          >
            {t('join_other_network')}
          </StyledText>
        </Flex>
      </Btn>
    </>
  )
}

interface HeadWithIPsProps {
  isSearching: boolean
}

const HeaderWithIPs = ({ isSearching }: HeadWithIPsProps): JSX.Element => {
  const { t } = useTranslation(['device_settings', 'shared'])
  const history = useHistory()
  return (
    <Flex
      flexDirection={DIRECTION_ROW}
      justifyContent={JUSTIFY_SPACE_BETWEEN}
      alignItems={ALIGN_CENTER}
      marginBottom="3.0625rem"
      flex="1"
    >
      <Flex justifyContent={JUSTIFY_START} flex="1">
        <Btn onClick={() => history.push('/network-setup')}>
          <Flex flexDirection={DIRECTION_ROW}>
            <Icon
              name="chevron-left"
              marginRight={SPACING.spacing4}
              size="1.875rem"
            />
            <StyledText
              fontSize="1.625rem"
              lineHeight="2.1875rem"
              fontWeight="700"
            >
              {t('shared:back')}
            </StyledText>
          </Flex>
        </Btn>
      </Flex>
      <Flex justifyContent={JUSTIFY_CENTER} flex="1">
        <StyledText fontSize="2rem" lineHeight="2.75rem" fontWeight="700">
          {t('connect_via', { type: t('wifi') })}
        </StyledText>
      </Flex>
      <Flex justifyContent={JUSTIFY_END} flex="1">
        {isSearching ? (
          <Icon
            name="ot-spinner"
            spin
            size="3.3125rem"
            data-testid="wifi_list_search_spinner"
          />
        ) : null}
      </Flex>
    </Flex>
  )
}
