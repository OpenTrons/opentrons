import * as React from 'react'

import {
  getDeckDefFromRobotType,
  FLEX_ROBOT_TYPE,
} from '@opentrons/shared-data'

import { Icon } from '../../icons'
import { Btn, Flex } from '../../primitives'
import { ALIGN_CENTER, DISPLAY_FLEX, JUSTIFY_CENTER } from '../../styles'
import { BORDERS, COLORS } from '../../ui-style-constants'
import { RobotCoordsForeignObject } from '../Deck/RobotCoordsForeignObject'

// TODO: replace stubs with JSON definitions when available
const standardSlotDef = {
  schemaVersion: 1,
  version: 1,
  namespace: 'opentrons',
  metadata: {
    displayName: 'standard slot',
  },
  parameters: {
    loadName: 'standard_slot',
  },
  boundingBox: {
    xDimension: 246.5,
    yDimension: 106.0,
    zDimension: 0,
  },
}

interface EmptyFixtureProps {
  fixtureLocation: string
  handleClickAdd: (fixtureLocation: string) => void
}

export function EmptyFixture(props: EmptyFixtureProps): JSX.Element {
  const { handleClickAdd, fixtureLocation } = props
  const deckDef = getDeckDefFromRobotType(FLEX_ROBOT_TYPE)

  // TODO: migrate to fixture location for v4
  const standardSlot = deckDef.locations.orderedSlots.find(
    slot => slot.id === fixtureLocation
  )
  const [xSlotPosition = 0, ySlotPosition = 0] = standardSlot?.position ?? []

  // TODO: remove adjustment when reading from fixture position
  // adjust x differently for right side/left side
  const isLeftSideofDeck =
    fixtureLocation === 'A1' ||
    fixtureLocation === 'B1' ||
    fixtureLocation === 'C1' ||
    fixtureLocation === 'D1'
  const xAdjustment = isLeftSideofDeck ? -101.5 : -17
  const x = xSlotPosition + xAdjustment
  const yAdjustment = -10
  const y = ySlotPosition + yAdjustment

  const { xDimension, yDimension } = standardSlotDef.boundingBox

  return (
    <RobotCoordsForeignObject
      width={xDimension}
      height={yDimension}
      x={x}
      y={y}
      flexProps={{ flex: '1' }}
      foreignObjectProps={{ flex: '1' }}
    >
      <Flex
        alignItems={ALIGN_CENTER}
        backgroundColor={COLORS.mediumBlueEnabled}
        border={`5px dashed ${COLORS.blueEnabled}`}
        borderRadius={BORDERS.radiusSoftCorners}
        justifyContent={JUSTIFY_CENTER}
        width="100%"
      >
        <Btn
          display={DISPLAY_FLEX}
          justifyContent={JUSTIFY_CENTER}
          onClick={() => handleClickAdd(fixtureLocation)}
        >
          <Icon name="add" color={COLORS.blueEnabled} height="2rem" />
        </Btn>
      </Flex>
    </RobotCoordsForeignObject>
  )
}
