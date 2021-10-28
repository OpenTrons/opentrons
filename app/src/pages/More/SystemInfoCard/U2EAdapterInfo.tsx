import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import styled from 'styled-components'

import {
  Box,
  Text,
  FONT_SIZE_BODY_1,
  FONT_SIZE_BODY_2,
  SPACING_2,
  SPACING_3,
} from '@opentrons/components'

import * as SystemInfo from '../../../redux/system-info'
import { U2EDeviceDetails } from './U2EDeviceDetails'

import type { State } from '../../../redux/types'

const U2EAdapterInfoBox = styled(Box)`
  list-style-type: none;
  font-size: ${FONT_SIZE_BODY_1};
  padding: ${SPACING_3};

  li {
    margin-bottom: ${SPACING_2};
  }
`

export const U2EAdapterInfo = (): JSX.Element => {
  const device = useSelector(SystemInfo.getU2EAdapterDevice)
  const driverOutdated = useSelector((state: State) => {
    const status = SystemInfo.getU2EWindowsDriverStatus(state)
    return status === SystemInfo.OUTDATED
  })
  const { t } = useTranslation('more_network_and_system')

  return (
    <U2EAdapterInfoBox as="ul">
      <Text as="li" fontSize={FONT_SIZE_BODY_2}>
        {t('u2e_adapter_information')}
      </Text>
      <U2EDeviceDetails device={device} driverOutdated={driverOutdated} />
    </U2EAdapterInfoBox>
  )
}
