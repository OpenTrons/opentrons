import * as React from 'react'
import { WASTE_CHUTE_CUTOUT } from '@opentrons/shared-data'
import {
  COLORS,
  FlexTrash,
  SingleSlotFixture,
  StagingAreaFixture,
  StagingAreaLocation,
  WasteChuteFixture,
  WasteChuteStagingAreaFixture,
} from '@opentrons/components'
import { darkFill, lightFill } from './DeckSetupContainer'
import type { TrashCutoutId } from '@opentrons/components'
import type {
  CutoutId,
  DeckDefinition,
  RobotType,
} from '@opentrons/shared-data'
import type { Fixture } from './constants'

interface FixtureRenderProps {
  fixture: Fixture
  cutout: CutoutId
  robotType: RobotType
  deckDef: DeckDefinition
}
export const FixtureRender = (props: FixtureRenderProps): JSX.Element => {
  const { fixture, cutout, deckDef, robotType } = props

  switch (fixture) {
    case 'stagingArea': {
      return (
        <StagingAreaFixture
          key={`fixtureRender_${fixture}`}
          cutoutId={cutout as StagingAreaLocation}
          deckDefinition={deckDef}
          slotClipColor={darkFill}
          fixtureBaseColor={lightFill}
        />
      )
    }
    case 'trashBin': {
      return (
        <React.Fragment key={`fixtureRender_${fixture}`}>
          <SingleSlotFixture
            cutoutId={cutout}
            deckDefinition={deckDef}
            slotClipColor={COLORS.transparent}
            fixtureBaseColor={lightFill}
          />
          <FlexTrash
            robotType={robotType}
            trashIconColor={lightFill}
            trashCutoutId={cutout as TrashCutoutId}
            backgroundColor={COLORS.grey50}
          />
        </React.Fragment>
      )
    }
    case 'wasteChute': {
      return (
        <WasteChuteFixture
          key={`fixtureRender_${fixture}`}
          cutoutId={cutout as typeof WASTE_CHUTE_CUTOUT}
          deckDefinition={deckDef}
          fixtureBaseColor={lightFill}
        />
      )
    }
    case 'wasteChuteAndStagingArea': {
      return (
        <WasteChuteStagingAreaFixture
          key={`fixtureRender_${fixture}`}
          cutoutId={cutout as typeof WASTE_CHUTE_CUTOUT}
          deckDefinition={deckDef}
          slotClipColor={darkFill}
          fixtureBaseColor={lightFill}
        />
      )
    }
  }
}
