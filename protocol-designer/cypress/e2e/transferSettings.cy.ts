import { SetupActions, SetupVerifications } from '../support/SetupSteps'
import { UniversalActions } from '../support/universalActions'
import { runSteps, StepListBuilder } from '../support/StepExecution'

describe('The Redesigned Create Protocol Landing Page', () => {
  beforeEach(() => {
    cy.visit('/')
    cy.verifyHomePage()
    cy.closeAnalyticsModal()
  })

  it('content and step 1 flow works', () => {
    cy.clickCreateNew()
    cy.verifyCreateNewHeader()

    // Build our list of steps with the new builder pattern
    const steps = new StepListBuilder()
      .addStep(SetupVerifications.OnStep1)
      .addStep(SetupVerifications.FlexSelected)
      .addStep(UniversalActions.Snapshot)
      .addStep(SetupActions.SelectOT2)
      .addStep(SetupVerifications.OT2Selected)
      .addStep(UniversalActions.Snapshot)
      .addStep(SetupActions.SelectFlex)
      .addStep(SetupVerifications.FlexSelected)
      .addStep(UniversalActions.Snapshot)
      .addStep(SetupActions.Confirm)
      .addStep(SetupVerifications.OnStep2)
      .addStep(SetupActions.SingleChannelPipette50)
      .addStep(SetupVerifications.StepTwo50uL)
      .addStep(UniversalActions.Snapshot)
      .addStep(SetupActions.Confirm)
      .addStep(SetupVerifications.StepTwoPart3)
      .addStep(UniversalActions.Snapshot)
      .addStep(SetupActions.Confirm)
      .addStep(SetupVerifications.OnStep3)
      .addStep(SetupActions.YesGripper)
      .addStep(SetupActions.Confirm)
      .addStep(SetupVerifications.Step4Verification)
      .addStep(SetupActions.AddThermocycler)
      .addStep(SetupVerifications.ThermocyclerImg)
      .addStep(SetupActions.AddHeaterShaker)
      .addStep(SetupVerifications.HeaterShakerImg)
      .addStep(SetupActions.AddMagBlock)
      .addStep(SetupVerifications.MagBlockImg)
      .addStep(SetupActions.AddTempdeck2)
      .addStep(SetupVerifications.Tempdeck2Img)
      .addStep(SetupActions.Confirm)
      .addStep(SetupActions.Confirm)
      .addStep(SetupActions.Confirm)
      .addStep(SetupActions.EditProtocolA)
      .addStep(SetupActions.ChoseDeckSlotC2)
      .addStep(SetupActions.AddHardwareLabware)
      .addStep(SetupActions.ClickLabwareHeader)
      .addStep(SetupActions.ClickWellPlatesSection)
      // function-based step with a parameter
      .addStep(SetupActions.SelectLabwareByDisplayName, 'Bio-Rad 96 Well Plate')
      .addStep(SetupActions.ChoseDeckSlotC2Labware)
      .addStep(SetupActions.AddLiquid)
      .addStep(SetupActions.ClickLiquidButton)
      .addStep(SetupActions.DefineLiquid)
      .addStep(SetupActions.LiquidSaveWIP)
      .addStep(SetupActions.WellSelector, ['A1', 'A2'])
      .addStep(SetupActions.LiquidDropdown)
      .addStep(SetupVerifications.LiquidPage)
      .addStep(UniversalActions.Snapshot)
      .addStep(SetupActions.SelectLiquidWells)
      .addStep(SetupActions.SetVolumeAndSaveforWells)
      .addStep(SetupActions.ChoseDeckSlotC3)
      .addStep(SetupActions.AddHardwareLabware)
      .addStep(SetupActions.ClickLabwareHeader)
      .addStep(SetupActions.ClickWellPlatesSection)
      // another function-based step with param
      .addStep(SetupActions.SelectLabwareByDisplayName, 'Bio-Rad 96 Well Plate')
      .addStep(SetupActions.ProtocolStepsH)
      .addStep(SetupActions.AddStep)
      .addStep(SetupVerifications.TransferPopOut)
      .addStep(UniversalActions.Snapshot)
      .build()

    // Execute the final list of steps
    runSteps(steps)
  })
})
