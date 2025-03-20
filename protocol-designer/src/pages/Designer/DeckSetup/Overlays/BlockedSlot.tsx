import { useSelector } from 'react-redux'
import {
  ALIGN_CENTER,
  COLORS,
  Flex,
  Icon,
  JUSTIFY_CENTER,
  SPACING,
  WasteChute,
} from '@opentrons/components'
import {
  getCutoutIdFromAddressableArea,
  getDeckDefFromRobotType,
  FLEX_ROBOT_TYPE,
  WASTE_CHUTE_CUTOUT,
} from '@opentrons/shared-data'
import { getHasWasteChute } from '@opentrons/step-generation'
import { getAdditionalEquipmentEntities } from '../../../../step-forms/selectors'
import { SlotOverlay } from './SlotOverlay'
import type { CoordinateTuple, DeckSlotId } from '@opentrons/shared-data'

interface BlockedSlotProps {
  slotId: DeckSlotId
  slotPosition: CoordinateTuple | null
}

export function BlockedSlot(props: BlockedSlotProps): JSX.Element | null {
  const { slotId, slotPosition } = props
  const deckDef = getDeckDefFromRobotType(FLEX_ROBOT_TYPE)
  const cutoutId = getCutoutIdFromAddressableArea(slotId, deckDef)
  const additionalEquipmentEntities = useSelector(
    getAdditionalEquipmentEntities
  )
  const hasWasteChute = getHasWasteChute(additionalEquipmentEntities)

  return cutoutId === WASTE_CHUTE_CUTOUT && hasWasteChute ? (
    <WasteChute
      backgroundColor={COLORS.white}
      wasteIconColor={COLORS.red50}
      opacity="0.8"
      overlay={
        <Flex
          //  NOTE: this border radius matches WasteChuteFixture's border radius
          borderRadius="6px"
          alignItems={ALIGN_CENTER}
          backgroundColor={COLORS.white}
          gridGap={SPACING.spacing8}
          justifyContent={JUSTIFY_CENTER}
          width="100%"
        >
          <Icon size="2.25rem" name="no-icon" color={COLORS.red50} />
        </Flex>
      }
    />
  ) : (
    <SlotOverlay
      slotId={slotId}
      slotPosition={slotPosition}
      slotFillOpacity="0.8"
      slotFillColor={COLORS.white}
    >
      <Icon size="2.25rem" name="no-icon" color={COLORS.red50} />
    </SlotOverlay>
  )
}
