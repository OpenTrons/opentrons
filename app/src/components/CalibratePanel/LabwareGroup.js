// @flow
import * as React from 'react'
import { useSelector } from 'react-redux'

import { SidePanelGroup } from '@opentrons/components'
import { selectors as robotSelectors } from '../../robot'

const TITLE = 'Labware Calibration'

export type LabwareGroupProps = {| children: React.Node |}

export function LabwareGroup(props: LabwareGroupProps) {
  const isRunning = useSelector(robotSelectors.getIsRunning)

  return (
    <SidePanelGroup title={TITLE} disabled={isRunning}>
      {props.children}
    </SidePanelGroup>
  )
}
