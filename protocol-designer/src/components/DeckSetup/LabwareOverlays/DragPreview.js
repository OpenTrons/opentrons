// @flow
import * as React from 'react'
import { DragLayer } from 'react-dnd'
import type { DeckSlotId, LabwareDefinition2 } from '@opentrons/shared-data'
import {
  LabwareRender,
  type RobotWorkSpaceRenderProps,
} from '@opentrons/components'
import { DND_TYPES } from './constants'

type DragPreviewProps = {
  isDragging: boolean,
  currentOffset?: { x: number, y: number },
  item: { slot: DeckSlotId, def: LabwareDefinition2 },
  itemType: string,
  getRobotCoordsFromDOMCoords: $PropertyType<
    RobotWorkSpaceRenderProps,
    'getRobotCoordsFromDOMCoords'
  >,
}

const LabwareDragPreview = (props: DragPreviewProps) => {
  const {
    item,
    itemType,
    isDragging,
    currentOffset,
    getRobotCoordsFromDOMCoords,
  } = props
  if (itemType !== DND_TYPES.LABWARE || !isDragging || !currentOffset)
    return null
  const { x, y } = currentOffset

  const cursor = getRobotCoordsFromDOMCoords(x, y)

  return (
    <g
      transform={`translate(${cursor.x}, ${cursor.y -
        item.def.dimensions.yDimension})`}
    >
      <LabwareRender definition={item && item.def} />
    </g>
  )
}

const DragPreview = DragLayer(monitor => ({
  currentOffset: monitor.getSourceClientOffset(),
  isDragging: monitor.isDragging(),
  itemType: monitor.getItemType(),
  item: monitor.getItem(),
}))(LabwareDragPreview)

export default DragPreview
