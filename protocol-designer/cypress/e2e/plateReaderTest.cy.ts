import { SetupSteps, SetupVerifications } from '../support/SetupSteps'
import { ModuleSteps, ModuleVerifications } from '../support/ModuleSteps'
import { UniversalSteps } from '../support/UniversalSteps'
import { StepBuilder } from '../support/StepBuilder'

describe('The Redesigned Create Protocol Landing Page', () => {
  beforeEach(() => {
    cy.visit('/')
    cy.verifyHomePage()
    cy.closeAnalyticsModal()
  })

  it('Plate Reader test', () => {
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
    steps.add(SetupSteps.ChoseDeckSlot('C3'))
    steps.add(SetupSteps.ChoseDeckSlotLabware('C3'))
    steps.add(SetupSteps.AddHardwareLabware())
    steps.add(SetupSteps.ClickLabwareHeader())
    steps.add(SetupSteps.ClickWellPlatesSection())
    steps.add(SetupSteps.SelectLabwareByDisplayName('Bio-Rad 96 Well Plate'))

    steps.add(SetupSteps.ChoseDeckSlotLabware('C3'))
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
    steps.add(SetupSteps.ChoseDeckSlot('D2'))
    steps.add(SetupSteps.ChoseDeckSlotLabware('D2'))
    steps.add(SetupSteps.AddHardwareLabware())
    steps.add(SetupSteps.ClickLabwareHeader())
    steps.add(SetupSteps.ClickWellPlatesSection())
    steps.add(SetupSteps.SelectLabwareByDisplayName('Armadillo 96 Well Plate'))
    steps.add(SetupSteps.ProtocolStepsH())
    steps.add(SetupSteps.AddStep())
    steps.add(SetupSteps.AddMoveStep())
    steps.add(SetupSteps.UseGripperinMove())
    steps.add(SetupSteps.ChoseSourceMoveLabware())
    steps.add(SetupSteps.selectDropdownLabware('Armadillo 96 Well Plate'))
    steps.add(SetupSteps.ChoseDestinationMoveLabware())
    steps.add(SetupSteps.selectDropdownLabware('Absorbance Plate Reader'))

    steps.add(SetupSteps.MoveToPlateReader())
    steps.add(SetupSteps.Save())
    steps.add(ModuleVerifications.NoMoveToPlateReaderWhenClosed())
    steps.add(SetupSteps.DeleteSteps())
    steps.add(SetupSteps.AddStep())
    steps.add(ModuleSteps.StartPlateReaderStep())
    steps.add(ModuleVerifications.PlateReaderPart1NoInitilization())
    steps.add(SetupSteps.Continue())
    steps.add(ModuleVerifications.PlateReaderPart2NoInitilization())
    steps.add(ModuleSteps.DefineInitilizationSingle())

    steps.execute()
  })
})
