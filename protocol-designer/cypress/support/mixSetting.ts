import { executeUniversalAction, UniversalActions } from './universalActions'
import { isEnumValue } from './utils'

export enum Actions {
  Confirm = 'Confirm',
  Continue = 'Continue',
  GoBack = 'Go back',
  Back = 'Back',
  Save = 'Save',
  Edit = 'Edit',
  SelectMix = "Select Mix",
  SelectLabware = 'Select on deck labware',
  SelectWellInputField = 'Select wells',
  EnterVolume = 'Enter a valid volume to mix',
  EnterMixReps = 'Enter number of repetions to mix',
  SelectTipHandling = 'Select how/if tips should be picked up for each mix',
  Aspirate = 'Select aspirate settings',
  Dispense = 'Select dispnse settings',

}

export enum Verifications {
  PartOne = 'Verify Part 1, the configuration of mix settings, and check continue button',
  PartTwoAsp = 'Verify Part 2, the configuration of asp settings and check go back and save button',
  PartTwoDisp = 'Verify Part 2, the configuration of disp settings and check go back and save button',
  WellSelectPopout = 'validate labware image and available wells',
}

export enum Content {
  Move = 'Move',
  Transfer = 'Transfer',
  Mix = 'Mix',
  Pause = 'Pause',
  HeaterShaker = 'Heater-shaker',
  Thermocyler = 'Thermocycler',
  Pipette = 'Pipette',
  Tiprack = 'Tiprack',
  Labware = 'Labware',
  SelectWells = 'Select wells',
  VolumePerWell = 'Volume per well',
  MixRepetitions = 'Mix repetitions',
  TipHandling = 'Tip handling',
  TipDropLocation = 'Tip drop location',
  ChooseOption = 'Choose option',
  Reservoir = 'Axygen 1 Well Reservoir 90 mL',
  WellPlate = 'Opentrons Tough 96 Well Plate 200 µL PCR Full Skirt',
  PartOne = 'Part 1 / 2',
  PartTwo = 'Part 2 / 2',
  WellSelectTitle = 'Select wells using a Flex 1-Channel 1000 μL',
  ClickAndDragWellSelect = "Click and drag to select wells",
  PipettePreselect = 'Flex 1-Channel 1000 μL',
  TiprackPreselect = 'Opentrons Flex 96 Tip Rack 1000 µL',
  BeforeEveryAsp = 'Before every aspirate',
  OnceAtStartStep = 'Once at the start of step',
  PerSourceWell = 'Per source well',
  PerDestWell = 'Per destination well',
  Never = 'Never',
  WasteChute = 'Waste chute',
  AspFlowRate = 'Aspirate flow rate',
  AspWellOrder = 'Aspirate well order',
  MixTipPosition = 'Mix tip position',
  AdvancedPipSettings = 'Advanced pipetting settings',
  Delay = 'Delay',
  DelayDuration = 'Delay Duration',
  DispFlowRate = "Dispense flow rate",
  Blowout = 'Blowout',
  TouchTip = 'Touch tip'

}

export enum Locators {
  Continue = 'button:contains("Continue")',
  GoBack = 'button:contains("Go back")',
  Back = 'button:contains("Back")',
  WellInputField = '[name="wells"]',
  Save = 'button:contains("Save")',
  OneWellReservoirImg = '[data-wellname="A1"]',
  Volume = '[name="volume"]',
  MixReps = '[name="times"]',
  Aspirate = 'button:contains("Aspirate")',
  Dispense = 'button:contains("Dispense")',
  // Step1Indicator = 'p:contains("Step 1")',
  // Step2Indicator = 'p:contains("Step 2")',
  // FlexOption = 'button:contains("Opentrons Flex")',
  // OT2Option = 'button:contains("Opentrons OT-2")',
  // NinetySixChannel = 'div:contains("96-Channel")',
}


const executeAction = (action: Actions | UniversalActions): void => {
  if (isEnumValue([UniversalActions], [action])) {
    executeUniversalAction(action as UniversalActions)
    return
  }



  switch (action) {
    case Actions.SelectMix:
      cy.get('button').contains('Mix').click()
      break
    case Actions.SelectLabware:
      cy.contains(Content.ChooseOption).should('be.visible').click()
      cy.contains(Content.Reservoir).should('be.visible').click()
      break
    case Actions.SelectWellInputField:
      cy.get(Locators.WellInputField).should('be.visible').click()
      break
    case Actions.EnterVolume:
      cy.get(Locators.Volume).should('exist').type('100')
      break
    case Actions.EnterMixReps:
      cy.get(Locators.MixReps).should('exist').type('5')
      break
    case Actions.SelectTipHandling:
      cy.contains(Content.BeforeEveryAsp).should('exist').should('be.visible').click()
      cy.contains(Content.OnceAtStartStep).should('exist').should('be.visible')
      cy.contains(Content.PerSourceWell).should('exist').should('be.visible')
      cy.contains(Content.PerDestWell).should('exist').should('be.visible')
      cy.contains(Content.Never).should('exist').should('be.visible')
      cy.contains(Content.OnceAtStartStep).click()
      break
    case Actions.Aspirate:
      cy.get(Locators.Aspirate).should('exist').should('be.visible').click()
      break
    case Actions.Dispense:
      cy.get(Locators.Dispense).should('exist').should('be.visible').click()
      break
    case Actions.Save:
      cy.get(Locators.Save).should('exist').should('be.visible').click()
      break
    case Actions.Back:
      cy.get(Locators.Back).should('exist').should('be.visible').click()
      break
    case Actions.Continue:
      cy.get(Locators.Continue).should('exist').should('be.visible').click({force: true})
      break
    default:
      throw new Error(`Unrecognized action: ${action as string}`)
  }
}

const verifyStep = (verification: Verifications): void => {
  switch (verification) {
    case Verifications.PartOne:
      cy.contains(Content.PartOne).should('exist').should('be.visible')
      cy.contains(Content.Mix).should('exist').should('be.visible')
      cy.contains(Content.Pipette).should('exist').should('be.visible')
      cy.contains(Content.PipettePreselect).should('exist').should('be.visible')
      cy.contains(Content.Tiprack).should('exist').should('be.visible')
      cy.contains(Content.TiprackPreselect).should('exist').should('be.visible')
      cy.contains(Content.Labware).should('exist').should('be.visible')
      cy.contains(Content.SelectWells).should('exist').should('be.visible')
      cy.contains(Content.VolumePerWell).should('exist').should('be.visible')
      cy.contains(Content.MixRepetitions).should('exist').should('be.visible')
      cy.contains(Content.TipHandling).should('exist').should('be.visible')
      cy.contains(Content.TipDropLocation).should('exist').should('be.visible')
      cy.contains(Content.WasteChute).should('exist').should('be.visible')
      cy.get(Locators.Continue).should('exist').should('be.visible')
      break
      case Verifications.WellSelectPopout:
        cy.contains(Content.WellSelectTitle).should('exist').should('be.visible')
        cy.contains(Content.ClickAndDragWellSelect).should('exist').should('be.visible')
        cy.get(Locators.OneWellReservoirImg).should('exist').should('be.visible')
        cy.get(Locators.Save).should('exist').should('be.visible')
        cy.get(Locators.Back).should('exist').should('be.visible')
        break
      case Verifications.PartTwoAsp:
        cy.contains(Content.PartTwo).should('exist').should('be.visible')
        cy.contains(Content.Mix).should('exist').should('be.visible')
        cy.get(Locators.Aspirate).should('exist').should('be.visible')
        cy.contains(Content.AspFlowRate).should('exist').should('be.visible')
        cy.contains(Content.AspWellOrder).should('exist').should('be.visible')
        cy.contains(Content.MixTipPosition).should('exist').should('be.visible')
        cy.contains(Content.AdvancedPipSettings).should('exist').should('be.visible')
        cy.contains(Content.Delay).should('exist').should('be.visible')
        cy.get(Locators.Back).should('exist').should('be.visible')
        cy.get(Locators.Save).should('exist').should('be.visible')
        break
      case Verifications.PartTwoDisp:
        cy.contains(Content.PartTwo).should('exist').should('be.visible')
        cy.contains(Content.Mix).should('exist').should('be.visible')
        cy.get(Locators.Dispense).should('exist').should('be.visible')
        cy.contains(Content.DispFlowRate).should('exist').should('be.visible')
        cy.contains(Content.AdvancedPipSettings).should('exist').should('be.visible')
        cy.contains(Content.Delay).should('exist').should('be.visible')
        cy.contains(Content.Blowout).should('exist').should('be.visible')
        cy.contains(Content.TouchTip).should('exist').should('be.visible')

        break
    default:
      throw new Error(
        `Unrecognized verification: ${verification as Verifications}`
      )
  }
}

export const runMixSetup = (
  steps: Array<Actions | Verifications | UniversalActions>
): void => {
  const enumsToCheck = [Actions, Verifications, UniversalActions]

  if (!isEnumValue(enumsToCheck, steps)) {
    throw new Error('One or more steps are unrecognized.')
  }

  steps.forEach(step => {
    if (isEnumValue([Actions], step)) {
      executeAction(step as Actions)
    } else if (isEnumValue([Verifications], step)) {
      verifyStep(step as Verifications)
    } else if (isEnumValue([UniversalActions], step)) {
      executeAction(step as UniversalActions)
    }
  })
}

