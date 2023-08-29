import * as React from 'react'
import isEqual from 'lodash/isEqual'
import { DeckDefinition, getDeckDefFromRobotType } from '@opentrons/shared-data'
import { RobotCoordinateSpace } from '../../hardware-sim/RobotCoordinateSpace'

import type { ModuleLocation, RobotType } from '@opentrons/shared-data'
import { COLORS, SPACING } from '../../ui-style-constants'
import { RobotCoordsForeignDiv, SlotLabels } from '../../hardware-sim'
import { Icon } from '../../icons'
import { Text } from '../../primitives'
import { ALIGN_CENTER, JUSTIFY_CENTER } from '../../styles'
import { DeckSlotLocation } from '../../hardware-sim/DeckSlotLocation'

const X_CROP_MM = 60
export function useDeckLocationSelect(
  robotType: RobotType
): { DeckLocationSelect: JSX.Element; selectedLocation: ModuleLocation } {
  const deckDef = getDeckDefFromRobotType(robotType)
  const [
    selectedLocation,
    setSelectedLocation,
  ] = React.useState<ModuleLocation>({
    slotName: deckDef.locations.orderedSlots[0].id,
  })
  return {
    DeckLocationSelect: (
      <DeckLocationSelect
        {...{ deckDef, selectedLocation, setSelectedLocation }}
      />
    ),
    selectedLocation,
  }
}

interface DeckLocationSelectProps {
  deckDef: DeckDefinition
  selectedLocation: ModuleLocation
  setSelectedLocation: (loc: ModuleLocation) => void
  disabledLocations?: ModuleLocation[]
}
export function DeckLocationSelect({
  deckDef,
  selectedLocation,
  setSelectedLocation,
  disabledLocations = [],
}: DeckLocationSelectProps): JSX.Element {
  return (
    <RobotCoordinateSpace
      viewBox={`${deckDef.cornerOffsetFromOrigin[0] + X_CROP_MM} ${
        deckDef.cornerOffsetFromOrigin[1]
      } ${deckDef.dimensions[0] - X_CROP_MM * 2} ${deckDef.dimensions[1]}`}
    >
      {deckDef.locations.orderedSlots.map(slot => {
        const slotLocation = { slotName: slot.id }
        const isDisabled = disabledLocations.some(
          l =>
            typeof l === 'object' && 'slotName' in l && l.slotName === slot.id
        )
        const isSelected = isEqual(selectedLocation, slotLocation)
        let fill = COLORS.highlightPurple2
        if (isSelected) fill = COLORS.highlightPurple1
        if (isDisabled) fill = COLORS.darkGreyDisabled
        return (
          <React.Fragment key={slot.id}>
            <DeckSlotLocation
              slotName={slot.id}
              slotBaseColor={fill}
              slotClipColor={COLORS.white}
              onClick={() => !isDisabled && setSelectedLocation(slotLocation)}
              cursor={isDisabled || isSelected ? 'default' : 'pointer'}
              deckDefinition={deckDef}
            />
            {isSelected ? (
              <RobotCoordsForeignDiv
                x={slot.position[0]}
                y={slot.position[1]}
                width={slot.boundingBox.xDimension}
                height={slot.boundingBox.yDimension}
                innerDivProps={{
                  display: 'flex',
                  alignItems: ALIGN_CENTER,
                  justifyContent: JUSTIFY_CENTER,
                  height: '100%',
                  gridGap: SPACING.spacing4,
                }}
              >
                <Icon name="check-circle" size="1.5rem" color={COLORS.white} />
                <Text color={COLORS.white} fontSize="1.5rem">
                  Selected
                </Text>
              </RobotCoordsForeignDiv>
            ) : null}
          </React.Fragment>
        )
      })}
      <SlotLabels
        robotType={deckDef.robot.model}
        color={COLORS.darkGreyEnabled}
      />
    </RobotCoordinateSpace>
  )
}
