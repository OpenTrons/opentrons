// @flow
import * as React from 'react'
import styled from 'styled-components'

import {
  Flex,
  Icon,
  Text,
  Link,
  OutlineButton,
  ALIGN_START,
  COLOR_WARNING,
  FONT_WEIGHT_SEMIBOLD,
} from '@opentrons/components'

import {
  U2E_DRIVER_UPDATE_URL,
  EVENT_U2E_DRIVER_LINK_CLICKED,
} from '../../system-info'
import { useTrackEvent } from '../../analytics'

// TODO(mc, 2020-05-08): i18n
const DRIVER_WARNING =
  "Your computer's Realtek USB-to-Ethernet adapter driver may be out of date. Please update your computer's driver to ensure you can connect to your OT-2."

const GET_UPDATE = 'get update'

const AlertIcon = styled(Icon)`
  flex: none;
  width: 1.5rem;
  margin-top: 0.25rem;
  margin-right: 0.5rem;
`

const GetUpdateButton = styled(OutlineButton)`
  flex: none;
  margin-left: 1rem;
`

export function U2EDriverWarning(props: React.ElementProps<typeof Flex>) {
  const trackEvent = useTrackEvent()

  return (
    <Flex {...props} alignItems={ALIGN_START} color={COLOR_WARNING}>
      <AlertIcon name="alert-circle" />
      <Text fontWeight={FONT_WEIGHT_SEMIBOLD}>{DRIVER_WARNING}</Text>
      <GetUpdateButton
        Component={Link}
        external={true}
        href={U2E_DRIVER_UPDATE_URL}
        onClick={() => {
          trackEvent({
            name: EVENT_U2E_DRIVER_LINK_CLICKED,
            properties: { source: 'card' },
          })
        }}
      >
        {GET_UPDATE}
      </GetUpdateButton>
    </Flex>
  )
}
