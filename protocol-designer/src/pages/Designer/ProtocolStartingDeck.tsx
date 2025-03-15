import { useState } from 'react'

import {
  ALIGN_CENTER,
  ALIGN_STRETCH,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  JUSTIFY_CENTER,
  JUSTIFY_FLEX_END,
  SPACING,
  ToggleGroup,
} from '@opentrons/components'

import { DeckSetupContainer } from './DeckSetup'
import { OffDeck } from './OffDeck'

import type { CutoutId } from '@opentrons/shared-data'
import type { DeckSlot } from '@opentrons/step-generation'

const leftString = 'On deck'
const rightString = 'Off deck'

interface ProtocolStartingDeckProps {
  zoomIn: {
    slot: DeckSlot | null
    cutout: CutoutId | null
  }
}

export function ProtocolStartingDeck({
  zoomIn,
}: ProtocolStartingDeckProps): JSX.Element {
  const [deckView, setDeckView] = useState<
    typeof leftString | typeof rightString
  >(leftString)

  const deckViewItems =
    deckView === leftString ? (
      <Flex
        height="100%"
        width="100%"
        justifyContent={JUSTIFY_CENTER}
        alignItems={ALIGN_CENTER}
      >
        <DeckSetupContainer tab="startingDeck" />
      </Flex>
    ) : (
      <OffDeck tab="startingDeck" />
    )

  return (
    <Flex
      flexDirection={DIRECTION_COLUMN}
      backgroundColor={COLORS.grey10}
      gridGap={SPACING.spacing24}
      padding={
        zoomIn.slot != null ? '0' : `${SPACING.spacing60} ${SPACING.spacing40}`
      }
      height="100%"
      width="100%"
    >
      <Flex
        flexDirection={DIRECTION_COLUMN}
        gridGap={SPACING.spacing24}
        height="100%"
      >
        {zoomIn.slot == null ? (
          <Flex
            justifyContent={JUSTIFY_FLEX_END}
            alignItems={ALIGN_CENTER}
            alignSelf={ALIGN_STRETCH}
            width="100%"
            height="2.25rem"
          >
            <ToggleGroup
              selectedValue={deckView}
              leftText={leftString}
              rightText={rightString}
              leftClick={() => {
                setDeckView(leftString)
              }}
              rightClick={() => {
                setDeckView(rightString)
              }}
            />
          </Flex>
        ) : null}
        {deckViewItems}
      </Flex>
    </Flex>
  )
}
