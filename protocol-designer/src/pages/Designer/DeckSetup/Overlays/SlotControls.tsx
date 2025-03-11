import { useTranslation } from 'react-i18next'
import { useRef } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useDrop, useDrag } from 'react-dnd'
import {
  ALIGN_CENTER,
  COLORS,
  CURSOR_POINTER,
  Flex,
  JUSTIFY_CENTER,
  Link,
  RobotCoordsForeignDiv,
  StyledText,
} from '@opentrons/components'
import { getCutoutIdFromAddressableArea } from '@opentrons/shared-data'

import {
  getLabwareIsCompatible,
  getLabwareIsCustom,
} from '../../../../utils/labwareModuleCompatibility'
import { getAdditionalEquipmentEntities } from '../../../../step-forms/selectors'
import { moveDeckItem } from '../../../../labware-ingred/actions'
import { selectors as labwareDefSelectors } from '../../../../labware-defs'
import { DND_TYPES } from '../../../../constants'
import { DECK_CONTROLS_STYLE } from '../constants'
import { BlockedSlot } from './BlockedSlot'
import { SlotOverlay } from './SlotOverlay'

import type { DropTargetMonitor } from 'react-dnd'
import type {
  Dimensions,
  ModuleType,
  DeckDefinition,
  CutoutId,
  AddressableAreaName,
} from '@opentrons/shared-data'
import type { SharedControlsType, DroppedItem } from '../types'

interface SlotControlsProps extends SharedControlsType {
  stagingAreaAddressableAreas: AddressableAreaName[]
  deckDef: DeckDefinition
  slotBoundingBox: Dimensions
  //  NOTE: slotId can be either AddressableAreaName or moduleId
  slotId: string
  moduleType: ModuleType | null
  handleDragHover?: () => void
}

export const SlotControls = (props: SlotControlsProps): JSX.Element | null => {
  const {
    slotBoundingBox,
    slotPosition,
    slotId,
    moduleType,
    hover,
    handleDragHover,
    setHover,
    setShowMenuListForId,
    itemId,
    tab,
    isSelected,
    deckDef,
    stagingAreaAddressableAreas,
  } = props
  const customLabwareDefs = useSelector(
    labwareDefSelectors.getCustomLabwareDefsByURI
  )
  const additionalEquipment = useSelector(getAdditionalEquipmentEntities)
  const cutoutId = getCutoutIdFromAddressableArea(itemId, deckDef)
  const trashSlots = Object.values(additionalEquipment)
    .filter(ae => ae.name === 'trashBin' || ae.name === 'wasteChute')
    ?.map(ae => ae.location as CutoutId)

  const hasTrash = cutoutId != null ? trashSlots.includes(cutoutId) : false
  const hasTrashAndNotD4 =
    hasTrash &&
    //  to allow for drag/drop into D4 next to a waste chute
    !stagingAreaAddressableAreas.includes(itemId as AddressableAreaName)

  const ref = useRef(null)
  const dispatch = useDispatch()
  const { t } = useTranslation(['deck', 'starting_deck_state'])

  const [, drag] = useDrag({
    type: DND_TYPES.LABWARE,
    item: { labwareOnDeck: null },
  })

  const [{ draggedItem, itemType, isOver }, drop] = useDrop(
    () => ({
      accept: DND_TYPES.LABWARE,
      canDrop: (item: DroppedItem) => {
        const draggedDef = item?.labwareOnDeck?.def
        console.assert(
          draggedDef,
          'no labware def of dragged def, expected it on drop'
        )
        if (moduleType != null && draggedDef != null) {
          // this is a module slot, prevent drop if the dragged labware is not compatible
          const isCustomLabware = getLabwareIsCustom(
            customLabwareDefs,
            item.labwareOnDeck
          )

          return (
            getLabwareIsCompatible(draggedDef, moduleType) || isCustomLabware
          )
        }
        return !hasTrashAndNotD4
      },
      drop: (item: DroppedItem) => {
        const droppedLabware = item
        if (droppedLabware.labwareOnDeck != null) {
          const droppedSlot = droppedLabware.labwareOnDeck.slot
          dispatch(moveDeckItem(droppedSlot, slotId))
        }
      },
      hover: () => {
        if (handleDragHover != null) {
          handleDragHover()
        }
      },
      collect: (monitor: DropTargetMonitor) => ({
        itemType: monitor.getItemType(),
        isOver: !!monitor.isOver({ shallow: true }),
        draggedItem: monitor.getItem() as DroppedItem,
      }),
    }),
    [moduleType, hasTrashAndNotD4, customLabwareDefs]
  )

  if (
    (itemType !== DND_TYPES.LABWARE && itemType !== null) ||
    slotPosition == null ||
    tab === 'protocolSteps' ||
    isSelected
  )
    return null

  const draggedDef = draggedItem?.labwareOnDeck?.def

  const isCustomLabware =
    draggedItem != null
      ? getLabwareIsCustom(customLabwareDefs, draggedItem.labwareOnDeck)
      : false

  const isSlotBlocked =
    (isOver &&
      moduleType != null &&
      draggedDef != null &&
      !getLabwareIsCompatible(draggedDef, moduleType) &&
      !isCustomLabware) ||
    (isOver && hasTrashAndNotD4)

  drag(drop(ref))

  const hoverOpacity = (hover != null && hover === itemId) || isOver ? '1' : '0'

  let body = (
    <RobotCoordsForeignDiv
      dataTestId={itemId}
      x={slotPosition[0]}
      y={slotPosition[1]}
      width={slotBoundingBox.xDimension}
      height={slotBoundingBox.yDimension}
      innerDivProps={{
        style: {
          opacity: hoverOpacity,
          ...DECK_CONTROLS_STYLE,
        },
        onMouseEnter: () => {
          setHover(itemId)
        },
        onMouseLeave: () => {
          setHover(null)
        },
        onClick: () => {
          if (!isOver) {
            setShowMenuListForId(itemId)
          }
        },
      }}
    >
      <Flex
        width={slotBoundingBox.xDimension}
        height={slotBoundingBox.yDimension}
        alignItems={ALIGN_CENTER}
        justifyContent={JUSTIFY_CENTER}
      >
        <Link role="button">
          <StyledText desktopStyle="bodyLargeSemiBold">
            {t('starting_deck_state:edit_slot')}
          </StyledText>
        </Link>
      </Flex>
    </RobotCoordsForeignDiv>
  )
  if (isSlotBlocked) {
    body = <BlockedSlot slotPosition={slotPosition} slotId={itemId} />
  } else if (isOver) {
    body = (
      <SlotOverlay
        slotPosition={slotPosition}
        slotId={itemId}
        slotFillColor={`${COLORS.black90}cc`}
        slotFillOpacity="1"
      >
        <Flex
          width={slotBoundingBox.xDimension}
          height={slotBoundingBox.yDimension}
          alignItems={ALIGN_CENTER}
          justifyContent={JUSTIFY_CENTER}
          color={COLORS.white}
        >
          <Link role="button">
            <StyledText desktopStyle="bodyLargeSemiBold">
              {t(`overlay.slot.place_here`)}
            </StyledText>
          </Link>
        </Flex>
      </SlotOverlay>
    )
  }
  return (
    <g ref={ref} style={{ cursor: CURSOR_POINTER }}>
      {body}
    </g>
  )
}
