// info on analytics data collected and toggle to opt in/out
import * as React from 'react'

import { Card } from '@opentrons/components'
import { AnalyticsToggle } from '../../../organisms/AnalyticsSettingsModal/AnalyticsToggle'

const TITLE = 'Privacy Settings'

export function AnalyticsSettingsCard(): JSX.Element {
  return (
    <Card title={TITLE}>
      <AnalyticsToggle />
    </Card>
  )
}
