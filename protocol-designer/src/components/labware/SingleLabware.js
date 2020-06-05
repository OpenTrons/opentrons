// @flow
import * as React from 'react'
import { LabwareRender, RobotWorkSpace } from '@opentrons/components'

type Props = React.ElementProps<typeof LabwareRender>

/** Avoid boilerplate for viewbox-based-on-labware-dimensions */
export function SingleLabware(props: Props): React.Node {
  return (
    <RobotWorkSpace
      viewBox={`0 0 ${props.definition.dimensions.xDimension} ${props.definition.dimensions.yDimension}`}
    >
      {() => <LabwareRender {...props} />}
    </RobotWorkSpace>
  )
}
