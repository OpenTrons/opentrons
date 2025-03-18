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

import { OffDeck } from '../OffDeck'

import type { CutoutId } from '@opentrons/shared-data'
import type { DeckSlot } from '@opentrons/step-generation'
import { StartingDeckContainer } from './StartingDeckContainer'

enum DeckView {
  ON_DECK = 'On deck',
  OFF_DECK = 'Off deck',
}

interface ProtocolStartingDeckProps {
  zoomIn: {
    slot: DeckSlot | null
    cutout: CutoutId | null
  }
}

export function ProtocolStartingDeck({
  zoomIn,
}: ProtocolStartingDeckProps): JSX.Element {
  const [deckView, setDeckView] = useState<DeckView>(DeckView.ON_DECK)

  const deckViewItems =
    deckView === DeckView.ON_DECK ? (
      <StartingDeckContainer />
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
              leftText={DeckView.ON_DECK}
              rightText={DeckView.OFF_DECK}
              leftClick={() => {
                setDeckView(DeckView.ON_DECK)
              }}
              rightClick={() => {
                setDeckView(DeckView.OFF_DECK)
              }}
            />
          </Flex>
        ) : null}
        {deckViewItems}
      </Flex>
    </Flex>
  )
}
