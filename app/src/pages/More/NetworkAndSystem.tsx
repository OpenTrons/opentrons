// Page for /more/network-and-system
import * as React from 'react'
import { css } from 'styled-components'

import { Page } from '../../atoms/Page'
import { NetworkSettingsCard } from './NetworkSettingsCard'
import { SystemInfoCard } from './SystemInfoCard'

// TODO(mc, 2020-04-27): i18n
const NETWORK_AND_SYSTEM = 'Network & System'

const CARD_GRID_STYLE = css`
  padding: 1.5rem 1.5rem 0.75rem 1.5rem;

  & > * {
    margin-bottom: 0.75rem;
  }
`

export const NetworkAndSystem = (): JSX.Element => (
  <Page titleBarProps={{ title: NETWORK_AND_SYSTEM }}>
    <div css={CARD_GRID_STYLE}>
      <NetworkSettingsCard />
      <SystemInfoCard />
    </div>
  </Page>
)
