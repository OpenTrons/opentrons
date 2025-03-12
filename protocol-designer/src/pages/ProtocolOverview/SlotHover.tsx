import { useMemo } from 'react'
import { useSelector } from 'react-redux'

import {
  ALIGN_CENTER,
  BORDERS,
  COLORS,
  Flex,
  JUSTIFY_CENTER,
  RobotCoordsForeignObject,
  SPACING,
} from '@opentrons/components'
import {
  getCutoutIdForAddressableArea,
  getDeckDefFromRobotType,
  THERMOCYCLER_MODULE_TYPE,
  FLEX_ROBOT_TYPE,
} from '@opentrons/shared-data'
import { getInitialDeckSetup } from '../../step-forms/selectors'
import {
  getFlexHoverDimensions,
  getOT2HoverDimensions,
} from '../Designer/DeckSetup/utils'
import type {
  CoordinateTuple,
  DeckSlotId,
  AddressableAreaName,
  RobotType,
} from '@opentrons/shared-data'
import type { Dispatch, SetStateAction } from 'react'

interface SlotHoverProps {
  hover: string | null
  setHover: Dispatch<SetStateAction<string | null>>
  slotId: DeckSlotId
  slotPosition: CoordinateTuple | null
  robotType: RobotType
}

export function SlotHover(props: SlotHoverProps): JSX.Element | null {
  const { hover, setHover, slotId, slotPosition, robotType } = props
  const deckSetup = useSelector(getInitialDeckSetup)
  const { additionalEquipmentOnDeck, modules } = deckSetup
  const deckDef = useMemo(() => getDeckDefFromRobotType(robotType), [])
  const hasTCOnSlot = Object.values(modules).find(
    module => module.slot === slotId && module.type === THERMOCYCLER_MODULE_TYPE
  )
  const tcSlots = robotType === FLEX_ROBOT_TYPE ? ['A1'] : ['8', '10', '11']
  const stagingAreaLocations = Object.values(additionalEquipmentOnDeck)
    .filter(ae => ae.name === 'stagingArea')
    ?.map(ae => ae.location as string)

  const cutoutId =
    getCutoutIdForAddressableArea(
      slotId as AddressableAreaName,
      deckDef.cutoutFixtures
    ) ?? 'cutoutD1'

  //  return null for TC slots
  if (slotPosition === null || (hasTCOnSlot && tcSlots.includes(slotId)))
    return null

  const hoverOpacity = hover != null && hover === slotId ? '1' : '0'
  const slotFill = (
    <Flex
      alignItems={ALIGN_CENTER}
      backgroundColor={`${COLORS.black90}cc`}
      borderRadius={BORDERS.borderRadius4}
      color={COLORS.white}
      gridGap={SPACING.spacing8}
      justifyContent={JUSTIFY_CENTER}
      width="100%"
    />
  )

  if (robotType === FLEX_ROBOT_TYPE) {
    const { width, height, x, y } = getFlexHoverDimensions(
      stagingAreaLocations,
      cutoutId,
      slotId,
      hasTCOnSlot != null,
      slotPosition
    )

    return (
      <RobotCoordsForeignObject
        key="flex_hover"
        width={width}
        height={height}
        x={x}
        y={y}
        flexProps={{ flex: '1' }}
        foreignObjectProps={{
          opacity: hoverOpacity,
          flex: '1',
          onMouseEnter: () => {
            setHover(slotId)
          },
          onMouseLeave: () => {
            setHover(null)
          },
        }}
      >
        {slotFill}
      </RobotCoordsForeignObject>
    )
  } else {
    const { width, height, x, y } = getOT2HoverDimensions(
      hasTCOnSlot != null,
      slotPosition
    )

    return (
      <RobotCoordsForeignObject
        key="ot2_hover"
        width={width}
        height={height}
        x={x}
        y={y}
        flexProps={{ flex: '1' }}
        foreignObjectProps={{
          opacity: hoverOpacity,
          flex: '1',
          onMouseEnter: () => {
            setHover(slotId)
          },
          onMouseLeave: () => {
            setHover(null)
          },
        }}
      >
        {slotFill}
      </RobotCoordsForeignObject>
    )
  }
}
