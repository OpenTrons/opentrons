import { Actions, Verifications, runCreateTest } from '../support/createNew'
import { UniversalActions } from '../support/universalActions'

describe('The Redesigned Create Protocol Landing Page', () => {
  beforeEach(() => {
    cy.visit('/')
    cy.verifyHomePage()
    cy.closeAnalyticsModal()
  })

  it('content and step 1 flow works', () => {
    cy.clickCreateNew()
    cy.verifyCreateNewHeader()
    const steps: Array<Actions | Verifications | UniversalActions> = [
      Verifications.OnStep1,
      Verifications.FlexSelected,
      UniversalActions.Snapshot,
      Actions.SelectOT2,
      Verifications.OT2Selected,
      UniversalActions.Snapshot,
      Actions.SelectFlex,
      Verifications.FlexSelected,
      UniversalActions.Snapshot,
      Actions.Confirm,
      Verifications.OnStep2,
      Actions.SingleChannelPipette50,
      Verifications.StepTwo50uL,
      UniversalActions.Snapshot,
      Actions.Confirm,
      Verifications.StepTwoPart3,
      UniversalActions.Snapshot,
      Actions.Confirm,
      Verifications.OnStep3,
      Actions.YesGripper,
      Actions.Confirm,
      Verifications.Step4Verification,
      Actions.AddThermocycler,
      Verifications.ThermocyclerImg,
      Actions.AddHeaterShaker,
      Verifications.HeaterShakerImg,
      Actions.AddMagBlock,
      Verifications.MagBlockImg,
      Actions.AddTempdeck2,
      Verifications.Tempdeck2Img,
      Actions.Confirm,
      Actions.Confirm,
      Actions.Confirm,
      Actions.EditProtocolA,
      Actions.ChoseDeckSlotC2,
      Actions.AddHardwareLabware,
      Actions.ClickLabwareHeader,
      Actions.ClickWellPlatesSection,
      Actions.SelectArmadillo96WellPlateDefinition,
      Actions.ChoseDeckSlotC2Labware,
      Actions.AddLiquid,
      Actions.ClickLiquidButton,
      Actions.DefineLiquid,
      Actions.LiquidSaveWIP,
      Actions.WellSelector,
      Actions.LiquidDropdown,
      Verifications.LiquidPage,
      UniversalActions.Snapshot,
      Actions.SelectLiquidWells,
      Actions.SetVolumeAndSaveforWells,
      Actions.ChoseDeckSlotC3,
      Actions.AddHardwareLabware,
      Actions.ClickLabwareHeader,
      Actions.ClickWellPlatesSection,
      Actions.SelectBioRad96WellPlateDefinition,
      Actions.ProtocolStepsH,
      Actions.AddStep,
      Actions.SelectTransfer,
      Verifications.TransferPopOut,
      UniversalActions.Snapshot,
      Actions.ChoseSourceLabware,
      Actions.SelectArmadillo96WellPlateTransfer,
      Actions.ChoseDestinationLabware,
      Actions.SelectBioRad96WellPlateTransfer,
    ]
    runCreateTest(steps)
    /*
    cy.contains('p', 'Source labware')
    cy.contains('p', 'Choose option').click()
    cy.contains(
      '(Retired) Armadillo 96 Well Plate 200 µL PCR Full Skirt in C2'
    ).click()

    cy.contains('p', 'Source labware')
    cy.get('input[name="aspirate_wells"]')
      .should('have.value', 'Choose wells')
      .click()

    cy.contains('Select source wells').should('be.visible')
    cy.contains('Chose wells').click()

    cy.contains('p', 'Destination labware').click()
    cy.contains('p', 'Choose option').click()
    cy.contains('p', 'Bio-Rad 96 Well Plate 200 µL PCR in C3').click()
    */
    /* Future work
    We need a better selector for source and destinatino wells.. they have the same selector
    Source wells
    cy.get(':nth-child(5) > .bsOFGI > .jmUzTo > .jBlELz > .sc-bqWxrE')
    cy.get('div[tabindex="0"].sc-bqWxrE').contains('Choose wells').click()
    Destination wells
    cy.get(':nth-child(7) > .bsOFGI > .jmUzTo > .jBlELz > .sc-bqWxrE')
    */
  })
})

/*
<div tabindex="0" class="Flex-sc-1qhp8l7-0 sc-bqWxrE jKLbYH gEhMNQ">
<div class="Flex-sc-1qhp8l7-0 icZZqw"><div class="Flex-sc-1qhp8l7-0 sc-ksBlkl jKLbYH cQzqYP">
<p class="Text-sc-1wb1h0f-0 StyledText__DesktopStyledText-sc-18lb8jp-0 StyledText-sc-18lb8jp-1 DropdownMenu___StyledStyledText-sc-ffghyc-0 cJXFkZ jAyaeC fjZvnJ">
Choose option</p></div></div><svg aria-hidden="true" 
*/
