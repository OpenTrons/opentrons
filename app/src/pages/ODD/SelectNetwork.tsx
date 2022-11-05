import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import { useHistory } from 'react-router-dom'
import {
  Flex,
  DIRECTION_COLUMN,
  useInterval,
  SPACING,
  ALIGN_CENTER,
  DIRECTION_ROW,
  Icon,
  useScroll,
  JUSTIFY_CENTER,
  POSITION_ABSOLUTE,
  POSITION_RELATIVE,
} from '@opentrons/components'

import * as Networking from '../../redux/networking'
import { getLocalRobot } from '../../redux/discovery'
import { StyledText } from '../../atoms/text'
import { TertiaryButton } from '../../atoms/buttons'
import { SearchNetwork } from '../../organisms/SetupNetworks/SearchNetwork'

import type { State, Dispatch } from '../../redux/types'

const LIST_REFRESH_MS = 10000

export function SelectNetwork(): JSX.Element {
  const { t } = useTranslation('device_settings')
  const localRobot = useSelector(getLocalRobot)
  const robotName = localRobot?.name != null ? localRobot.name : 'no name'
  const dispatch = useDispatch<Dispatch>()
  const list = useSelector((state: State) =>
    Networking.getWifiList(state, robotName)
  )
  const history = useHistory()
  const scroll = useScroll()

  React.useEffect(() => {
    dispatch(Networking.fetchWifiList(robotName))
  }, [dispatch, robotName])

  useInterval(
    () => dispatch(Networking.fetchWifiList(robotName)),
    LIST_REFRESH_MS,
    true
  )

  const handleSearch = (): void => {
    dispatch(Networking.fetchWifiList(robotName))
  }

  return (
    <Flex flexDirection={DIRECTION_COLUMN} padding={SPACING.spacingXXL}>
      {list.length > 0 ? (
        <>
          <HeaderWithIPs handleSearch={handleSearch} />
          {list.map(nw => (
            <Flex
              ref={scroll.ref}
              width="59rem"
              height="4rem"
              flexDirection={DIRECTION_ROW}
              padding={SPACING.spacing4}
              key={nw.ssid}
              backgroundColor="#d6d6d6"
              alignItems={ALIGN_CENTER}
              marginBottom={SPACING.spacing3}
              borderRadius="0.75rem"
              onClick={() => history.push(`setWifiCred/${nw.ssid}`)}
            >
              <Icon name="wifi" size="2.25rem" />
              <StyledText marginLeft={SPACING.spacing4} color="#000">
                {nw.ssid}
              </StyledText>
            </Flex>
          ))}
        </>
      ) : (
        <>
          <Flex justifyContent={JUSTIFY_CENTER} marginBottom="3.041875rem">
            <StyledText
              fontSize="2rem"
              fontWeight="700"
              lineHeight="2.72375rem"
            >
              {t('connect_to_a_network')}
            </StyledText>
          </Flex>
          <SearchNetwork />
        </>
      )}
    </Flex>
  )
}

interface HeadWithIPsProps {
  handleSearch: () => void
}

const HeaderWithIPs = ({ handleSearch }: HeadWithIPsProps): JSX.Element => {
  const { t } = useTranslation('device_settings')
  return (
    <Flex
      flexDirection={DIRECTION_ROW}
      alignItems={ALIGN_CENTER}
      justifyContent={JUSTIFY_CENTER}
      position={POSITION_RELATIVE}
      marginBottom="3.041875rem"
    >
      <Flex>
        <StyledText fontSize="2rem" fontWeight="700" lineHeight="2.72375rem">
          {t('connect_to_a_network')}
        </StyledText>
      </Flex>

      <Flex position={POSITION_ABSOLUTE} right="0">
        <TertiaryButton
          width="11.8125rem"
          height="3.75rem"
          fontSize="1.5rem"
          fontWeight="500"
          lineHeight="2.0425rem"
          onClick={handleSearch}
        >
          {'Search again'}
        </TertiaryButton>
      </Flex>
    </Flex>
  )
}
