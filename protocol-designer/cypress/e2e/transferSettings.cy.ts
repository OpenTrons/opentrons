import { SetupSteps, SetupVerifications } from '../support/SetupSteps'
import { UniversalSteps } from '../support/UniversalSteps'
import { StepBuilder } from '../support/StepBuilder'

describe('The Redesigned Create Protocol Landing Page', () => {
  beforeEach(() => {
    cy.visit('/')
    cy.verifyHomePage()
    cy.closeAnalyticsModal()
  })

  it('content and step 1 flow works', () => {
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
    steps.add(SetupSteps.YesGripper())
    steps.add(SetupSteps.Confirm())
    steps.add(SetupVerifications.Step4Verification())
    steps.add(SetupSteps.AddThermocycler())
    steps.add(SetupVerifications.ThermocyclerImg())
    steps.add(SetupSteps.AddHeaterShaker())
    steps.add(SetupVerifications.HeaterShakerImg())
    steps.add(SetupSteps.AddMagBlock())
    steps.add(SetupVerifications.MagBlockImg())
    steps.add(SetupSteps.AddTempdeck2())
    steps.add(SetupVerifications.Tempdeck2Img())
    steps.add(SetupSteps.Confirm())
    steps.add(SetupSteps.Confirm())
    steps.add(SetupSteps.Confirm())
    steps.add(SetupSteps.EditProtocolA())
    steps.add(SetupSteps.ChoseDeckSlot('C2'))
    steps.add(SetupSteps.AddHardwareLabware())
    steps.add(SetupSteps.ClickLabwareHeader())
    steps.add(SetupSteps.ClickWellPlatesSection())
    steps.add(SetupSteps.SelectLabwareByDisplayName('Bio-Rad 96 Well Plate'))

    steps.add(SetupSteps.ChoseDeckSlotC2Labware())

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
    steps.add(SetupSteps.ChoseDeckSlot('C3'))

    steps.add(SetupSteps.AddHardwareLabware())
    steps.add(SetupSteps.ClickLabwareHeader())
    steps.add(SetupSteps.ClickWellPlatesSection())
    steps.add(SetupSteps.SelectLabwareByDisplayName('Armadillo 96 Well Plate'))

    steps.add(SetupSteps.ProtocolStepsH())
    steps.add(SetupSteps.AddStep())
    steps.add(SetupVerifications.TransferPopOut())
    steps.add(UniversalSteps.Snapshot())

    steps.add(SetupSteps.AddSourceLabwareDropdown())
    steps.add(SetupSteps.selectDropdownLabware('Armadillo 96 Well Plate'))
    steps.add(SetupSteps.SelectSourceWells())
    steps.add(SetupSteps.WellSelector(['A1', 'A2']))
    steps.add(SetupSteps.SaveSelectedWells())
    steps.add(SetupSteps.ChoseDestinationLabware())
    steps.add(SetupSteps.selectDropdownLabware('Bio-Rad 96 Well Plate'))
    steps.add(SetupSteps.SelectDestinationWells())
    steps.add(SetupSteps.WellSelector(['A1', 'A2']))
    steps.add(SetupSteps.SaveSelectedWells())
    steps.add(SetupSteps.InputTransferVolume('30'))
    steps.add(SetupSteps.Continue())
    steps.add(SetupSteps.PrewetAspirate())
    /* 
    SetupSteps.SelectDestinationWells,
    SetupSteps.WellSelector,
    SetupSteps.SaveSelectedWells,
    SetupSteps.InputTransferVolume('30'),
    SetupSteps.Continue,
    SetupSteps.PrewetAspirate,
    Beep
    SetupSteps.DelayAspirate,
    SetupSteps.TouchTipAspirate,
    SetupSteps.MixAspirate,
    SetupSteps.AirGapAspirate,
    SetupVerifications.Delay,
    SetupVerifications.PreWet,
    SetupVerifications.TouchTip,
    SetupVerifications.MixT,
    SetupVerifications.AirGap,
    SetupSteps.AspirateMixVolume('20'),
    SetupSteps.AspirateMixTimes('2'),
    SetupSteps.AspirateAirGapVolume('10'),
    SetupSteps.SelectDispense,
    SetupSteps.DelayAspirate,
    SetupSteps.TouchTipAspirate,
    SetupSteps.MixAspirate,
    SetupSteps.AirGapAspirate,
    SetupSteps.DispenseMixVolume('20'),
    SetupSteps.DispenseMixTimes,
    SetupSteps.DispenseAirGapVolume,
    SetupSteps.BlowoutTransferDestination,
    SetupVerifications.ExtraDispenseTransfer,
    */
    steps.execute()
  })
})
