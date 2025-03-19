import { Box } from '@opentrons/components'
import { OT2_ROBOT_TYPE } from '@opentrons/shared-data'
import { SlotDetailsContainer } from '../../../components/organisms'
import type { RobotType } from '@opentrons/shared-data'

const LEFT_SLOTS = [
  'A1',
  'A2',
  'B1',
  'B2',
  'C1',
  'C2',
  'D1',
  'D2',
  '1',
  '2',
  '4',
  '5',
  '7',
  '8',
  '10',
  '11',
]

interface HoverSlotDetailsContainerProps {
  hoverSlot: string
  robotType: RobotType
}

export function HoverSlotDetailsContainer({
  hoverSlot,
  robotType,
}: HoverSlotDetailsContainerProps): JSX.Element {
  return (
    <Box
      position="absolute"
      top="50%"
      transform="translateY(-50%)"
      left={LEFT_SLOTS.includes(hoverSlot) ? '2%' : 'auto'}
      right={LEFT_SLOTS.includes(hoverSlot) ? 'auto' : '2%'}
      zIndex={3}
      width="100%"
      maxWidth={robotType === OT2_ROBOT_TYPE ? '358' : '317px'}
      data-testid="hover-slot-details-container"
    >
      <SlotDetailsContainer robotType={robotType} slot={hoverSlot} />
    </Box>
  )
}
