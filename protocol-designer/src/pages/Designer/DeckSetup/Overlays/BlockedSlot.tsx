import { COLORS, Icon } from '@opentrons/components'
import { SlotOverlay } from './SlotOverlay'
import type { CoordinateTuple, DeckSlotId } from '@opentrons/shared-data'

interface BlockedSlotProps {
  slotId: DeckSlotId
  slotPosition: CoordinateTuple | null
}

export function BlockedSlot(props: BlockedSlotProps): JSX.Element | null {
  const { slotId, slotPosition } = props
  return (
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
