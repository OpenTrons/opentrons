import { useDispatch } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { useDrag, useDrop } from 'react-dnd'
import { useEffect, useRef } from 'react'
import {
  ALIGN_CENTER,
  COLORS,
  CURSOR_GRAB,
  Flex,
  JUSTIFY_CENTER,
  Link,
  RobotCoordsForeignDiv,
  StyledText,
  TYPOGRAPHY,
} from '@opentrons/components'
import { DND_TYPES } from '../../../../constants'
import { moveDeckItem } from '../../../../labware-ingred/actions'
import { DECK_CONTROLS_STYLE } from '../constants'
import { BlockedSlot } from './BlockedSlot'
import { SlotOverlay } from './SlotOverlay'

import type { DropTargetMonitor } from 'react-dnd'
import type { LabwareOnDeck } from '../../../../step-forms'
import type { ThunkDispatch } from '../../../../types'
import type { SharedControlsType, DroppedItem } from '../types'

interface LabwareControlsProps extends SharedControlsType {
  labwareOnDeck: LabwareOnDeck
  setHoveredLabware: (labware?: LabwareOnDeck | null) => void
  setDraggedLabware: (labware?: LabwareOnDeck | null) => void
  swapBlocked: boolean
}

export const LabwareControls = (
  props: LabwareControlsProps
): JSX.Element | null => {
  const {
    labwareOnDeck,
    slotPosition,
    setHoveredLabware,
    setDraggedLabware,
    swapBlocked,
    hover,
    setHover,
    setShowMenuListForId,
    isSelected,
    tab,
    itemId,
  } = props
  const dispatch = useDispatch<ThunkDispatch<any>>()
  const ref = useRef(null)
  const canDropRef = useRef(false)
  const { t } = useTranslation(['starting_deck_state', 'deck'])

  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: DND_TYPES.LABWARE,
      item: { labwareOnDeck },
      collect: monitor => ({
        isDragging: monitor.isDragging(),
      }),
    }),
    [labwareOnDeck]
  )

  const [{ isOver, draggedLabware, canDrop }, drop] = useDrop(
    () => ({
      accept: DND_TYPES.LABWARE,
      canDrop: (item: DroppedItem) => {
        const draggedLabware = item?.labwareOnDeck
        const isDifferentSlot =
          draggedLabware && draggedLabware.slot !== labwareOnDeck.slot
        return isDifferentSlot && !swapBlocked
      },
      drop: (item: DroppedItem) => {
        const draggedLabware = item?.labwareOnDeck
        if (draggedLabware != null) {
          dispatch(moveDeckItem(draggedLabware.slot, labwareOnDeck.slot))
        }
      },
      hover: () => {
        setHoveredLabware(labwareOnDeck)
      },
      collect: (monitor: DropTargetMonitor) => ({
        isOver: monitor.isOver({ shallow: true }),
        draggedLabware: monitor.getItem() as DroppedItem,
        canDrop: monitor.canDrop(),
      }),
    }),
    [labwareOnDeck, swapBlocked]
  )

  useEffect(() => {
    canDropRef.current = canDrop
  }, [canDrop])

  useEffect(() => {
    if (draggedLabware != null) {
      setDraggedLabware(draggedLabware?.labwareOnDeck)
    } else {
      setHoveredLabware(null)
      setDraggedLabware(null)
    }
  }, [draggedLabware])

  const isBeingDragged =
    draggedLabware?.labwareOnDeck?.slot === labwareOnDeck.slot

  drag(drop(ref))

  if (tab === 'protocolSteps' || isSelected || slotPosition == null) {
    return null
  }
  const isLabwareSwapping =
    draggedLabware?.labwareOnDeck?.slot !== labwareOnDeck.slot
  const [x, y] = slotPosition
  const width = labwareOnDeck.def.dimensions.xDimension
  const height = labwareOnDeck.def.dimensions.yDimension

  const getDisplayText = (): string => {
    if (isDragging) {
      return t('deck:overlay.slot.drag_to_new_slot')
    } else if (isOver && canDrop) {
      if (isLabwareSwapping) {
        return t('deck:overlay.slot.swap_labware')
      } else {
        return t('deck:overlay.slot.place_here')
      }
    } else if (!isDragging && !isBeingDragged && !isOver && !canDrop) {
      return t('edit_labware')
    } else {
      return ''
    }
  }

  let hoverOpacity = '0'
  if (!isDragging && isBeingDragged) {
    hoverOpacity = '0'
  } else if ((isOver && canDrop) || hover === itemId) {
    hoverOpacity = '1'
  }

  const hoverInfo = (
    <Flex
      ref={ref}
      width={width}
      height={height}
      alignItems={ALIGN_CENTER}
      justifyContent={JUSTIFY_CENTER}
      color={COLORS.white}
      textAlign={TYPOGRAPHY.textAlignCenter}
    >
      <Link role="button">
        <StyledText desktopStyle="bodyLargeSemiBold">
          {getDisplayText()}
        </StyledText>
      </Link>
    </Flex>
  )

  let body = (
    <RobotCoordsForeignDiv
      {...{ x, y, width, height }}
      dataTestId={itemId}
      innerDivProps={{
        style: {
          opacity: hoverOpacity,
          ...DECK_CONTROLS_STYLE,
          zIndex: isOver && canDrop ? 10 : 'auto',
          // NOTE: cursor is inconsistent when dragging due to an active
          // react dnd bug: https://github.com/react-dnd/react-dnd/issues/325
          cursor: CURSOR_GRAB,
        },
        onMouseEnter: () => {
          setHover(itemId)
        },
        onMouseLeave: () => {
          setHover(null)
        },
        onClick: () => {
          if (!isBeingDragged) {
            setShowMenuListForId(itemId)
          }
        },
      }}
    >
      {hoverInfo}
    </RobotCoordsForeignDiv>
  )

  if (swapBlocked) {
    body = <BlockedSlot slotId={itemId} slotPosition={slotPosition} />
  } else if (canDropRef.current && isLabwareSwapping) {
    body = (
      <SlotOverlay
        slotId={itemId}
        slotPosition={slotPosition}
        slotFillColor={`${COLORS.black90}cc`}
        slotFillOpacity={hoverOpacity}
      >
        {hoverInfo}
      </SlotOverlay>
    )
  }
  return <>{body}</>
}
