import { DragPreviewImage, useDrag, useDragLayer } from 'react-dnd'
import {
  ALIGN_CENTER,
  CURSOR_GRABBING,
  Flex,
  JUSTIFY_CENTER,
  POSITION_ABSOLUTE,
  RobotCoordsForeignDiv,
} from '@opentrons/components'

import previewImage from '../../../../assets/images/preview.svg'
import { DND_TYPES } from '../../../../constants'
import { DECK_CONTROLS_STYLE } from '../constants'

import type { RobotCoordinateSpaceWithRefRenderProps } from '@opentrons/components'
import type { DroppedItem } from '../types'

const PREVIEW_SIZE_ADJUSTMENT = 25
interface DragPreviewProps {
  getRobotCoordsFromDOMCoords: RobotCoordinateSpaceWithRefRenderProps['getRobotCoordsFromDOMCoords']
}

export function DragPreview(props: DragPreviewProps): JSX.Element | null {
  const { getRobotCoordsFromDOMCoords } = props
  const {
    item,
    currentOffset,
    initialClientOffset,
    initialSourceClientOffset,
    itemType,
  } = useDragLayer(monitor => ({
    itemType: monitor.getItemType(),
    item: monitor.getItem() as DroppedItem,
    currentOffset: monitor.getSourceClientOffset(),
    initialClientOffset: monitor.getInitialClientOffset(),
    initialSourceClientOffset: monitor.getInitialSourceClientOffset(),
  }))

  const [{ isDragging }, drag, preview] = useDrag(
    () => ({
      type: DND_TYPES.LABWARE,
      collect: monitor => ({
        isDragging: !!monitor.isDragging(),
      }),
    }),
    []
  )

  if (
    !currentOffset ||
    !item ||
    itemType !== DND_TYPES.LABWARE ||
    !initialClientOffset ||
    !initialSourceClientOffset
  ) {
    return null
  }

  const width =
    item.labwareOnDeck.def.dimensions.xDimension + PREVIEW_SIZE_ADJUSTMENT
  const height =
    item.labwareOnDeck.def.dimensions.yDimension + PREVIEW_SIZE_ADJUSTMENT

  const delta = {
    x: initialClientOffset.x - initialSourceClientOffset.x,
    y: initialClientOffset.y - initialSourceClientOffset.y,
  }

  // Get cursor position in robot coordinates
  const cursor = getRobotCoordsFromDOMCoords(currentOffset.x, currentOffset.y)

  // Adjust the position based on where the user initially clicked
  const adjustedX = cursor.x - delta.x
  const adjustedY = cursor.y - delta.y

  return (
    <RobotCoordsForeignDiv
      x={adjustedX}
      y={adjustedY}
      width={width}
      height={height}
      innerDivProps={{
        style: {
          opacity: 0.2,
          ...DECK_CONTROLS_STYLE,
          position: POSITION_ABSOLUTE,
          cursor: CURSOR_GRABBING,
          pointerEvents: 'none',
        },
      }}
    >
      <>
        {isDragging && (
          <DragPreviewImage src={previewImage} connect={preview} />
        )}
        <Flex
          ref={drag}
          width={width}
          height={height}
          alignItems={ALIGN_CENTER}
          justifyContent={JUSTIFY_CENTER}
        />
      </>
    </RobotCoordsForeignDiv>
  )
}
