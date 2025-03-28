import { UniversalSteps } from '../support/UniversalSteps'
import {
  SetupSteps,
  SetupVerifications,
  CompositeSetupSteps,
} from '../support/SetupSteps'
import { StepBuilder } from '../support/StepBuilder'

describe('Create new Flex', () => {
  beforeEach(() => {
    cy.visit('/')
    cy.closeAnalyticsModal()
  })

  it('Goes through onboarding workflow for Flex', () => {
    cy.clickCreateNew()
    cy.verifyCreateNewHeader()

    const steps = new StepBuilder()
    steps.add(
      CompositeSetupSteps.FlexSetup({
        thermocycler: true,
        heatershaker: true,
        magblock: true,
        tempdeck: true,
      })
    )
    steps.add(
      CompositeSetupSteps.AddLabwareToDeckSlot('C2', 'Bio-Rad 96 Well Plate')
    )
    steps.add(SetupSteps.ChoseDeckSlotWithLabware('C2'))
    steps.add(SetupSteps.AddLiquid())
    steps.add(SetupSteps.ClickLiquidButton())
    steps.add(SetupSteps.DefineLiquid())
    steps.add(SetupSteps.LiquidSaveWIP())
    steps.add(SetupSteps.WellSelector(['A1', 'A2']))
    steps.add(SetupSteps.LiquidDropdown())
    steps.add(SetupVerifications.LiquidPage())
    steps.add(UniversalSteps.Snapshot())
    steps.add(SetupSteps.SelectLiquidWells())
    steps.add(SetupSteps.SetVolumeAndSaveForWells('150'))
    steps.add(
      CompositeSetupSteps.AddLabwareToDeckSlot(
        'C3',
        'Armadillo 96 Well Plate 200 µL'
      )
    )
    steps.execute()
  })
})
