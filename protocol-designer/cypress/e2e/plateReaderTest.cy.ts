import {
  SetupSteps,
  SetupVerifications,
  CompositeSetupSteps,
} from '../support/SetupSteps'
import { ModuleSteps, ModuleVerifications } from '../support/ModuleSteps'
import { UniversalSteps } from '../support/UniversalSteps'
import { StepBuilder } from '../support/StepBuilder'

describe('Plate Reader Happy Path Single-Wavelength', () => {
  beforeEach(() => {
    cy.visit('/')
    cy.verifyHomePage()
    cy.closeAnalyticsModal()
  })

  it('Scans one wavelegth for plate reader and checks erros', () => {
    cy.clickCreateNew()
    cy.verifyCreateNewHeader()
    const steps = new StepBuilder()
    steps.add(SetupVerifications.OnStep1())
    steps.add(SetupVerifications.FlexSelected())
    steps.add(UniversalSteps.Snapshot())
    steps.add(SetupSteps.SelectOT2())
    steps.add(SetupVerifications.OT2Selected())
    steps.add(UniversalSteps.Snapshot())
    steps.add(SetupSteps.SelectFlex())
    steps.add(SetupVerifications.FlexSelected())
    steps.add(UniversalSteps.Snapshot())
    steps.add(SetupSteps.Confirm())
    steps.add(SetupVerifications.OnStep2())
    steps.add(SetupSteps.SingleChannelPipette50())
    steps.add(SetupVerifications.StepTwo50uL())
    steps.add(UniversalSteps.Snapshot())
    steps.add(SetupSteps.Confirm())
    steps.add(SetupVerifications.StepTwoPart3())
    steps.add(UniversalSteps.Snapshot())
    steps.add(SetupSteps.Confirm())
    steps.add(SetupVerifications.OnStep3())
    steps.add(SetupSteps.NoGripper())
    steps.add(SetupSteps.Confirm())
    steps.add(SetupVerifications.AbsorbanceNotSelectable())
    steps.add(SetupSteps.GoBack())
    steps.add(SetupSteps.YesGripper())
    steps.add(SetupSteps.Confirm())
    steps.add(SetupSteps.AddPlateReader())
    steps.add(SetupSteps.Confirm())
    steps.add(SetupSteps.Confirm())
    steps.add(SetupSteps.Confirm())
    steps.add(SetupSteps.EditProtocolA())
    steps.add(
      CompositeSetupSteps.AddLabwareToDeckSlot('C3', 'Bio-Rad 96 Well Plate')
    )
    steps.add(SetupSteps.ChoseDeckSlotWithLabware('C3'))
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
    // Add another labware
    steps.add(SetupSteps.ChoseDeckSlotWithLabware('D2'))

    steps.add(SetupSteps.AddHardwareLabware())
    steps.add(SetupSteps.ClickLabwareHeader())
    steps.add(SetupSteps.ClickWellPlatesSection())
    steps.add(SetupSteps.SelectLabwareByDisplayName('Armadillo 96 Well Plate'))
    steps.add(SetupSteps.ProtocolStepsH())
    steps.add(SetupSteps.AddStep())

    // Move labware attempt to Plate Reader
    steps.add(SetupSteps.AddMoveStep())
    steps.add(SetupSteps.UseGripperinMove())
    steps.add(SetupSteps.ChoseSourceMoveLabware())
    steps.add(SetupSteps.selectDropdownLabware('Armadillo 96 Well Plate'))
    steps.add(SetupSteps.ChoseDestinationMoveLabware())
    steps.add(SetupSteps.selectDropdownLabware('Absorbance Plate Reader'))
    steps.add(SetupSteps.MoveToPlateReader())
    steps.add(SetupSteps.Save())
    steps.add(ModuleVerifications.NoMoveToPlateReaderWhenClosed())
    // You can't move to Plate Reader while it's closed
    steps.add(SetupSteps.DeleteSteps('1. Move'))
    steps.add(SetupSteps.AddStep())
    steps.add(ModuleSteps.StartPlateReaderStep())
    steps.add(ModuleVerifications.PlateReaderPart1NoInitilization())
    steps.add(SetupSteps.Continue())
    // Define a plate read
    steps.add(ModuleVerifications.PlateReaderPart2NoInitilization())
    steps.add(ModuleSteps.DefineInitilizationSingleCheckAll())
    steps.add(ModuleSteps.DefineCustomWavelegthSingle('300'))
    steps.add(SetupSteps.Save())
    steps.execute()
  })
})
