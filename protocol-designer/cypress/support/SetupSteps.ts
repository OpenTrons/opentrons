// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { StepThunk } from './StepBuilder'
import { UniversalSteps } from './UniversalSteps' // Adjust the path

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      chooseDeckSlot: (slot: string) => Cypress.Chainable<void>
    }
  }
}

export enum SetupContent {
  Step1Title = 'Step 1',
  Step2Title = 'Step 2',
  Step3Title = 'Step3',
  Step4Title = 'Step4',
  AddPipette = 'Add a pipette',
  NinetySixChannel = '96-Channel',
  SingleChannel = '1-Channel',
  EightChannel = '8-Channel',
  TipRack = 'Filter Tip Rack 50 µL',
  PipetteType = 'Pipette type',
  PipetteVolume = 'Pipette volume',
  FullP50SingleName = 'Flex 1-Channel 50 µL',
  FullP50TiprackName = 'Opentrons Flex 96 Filter Tip Rack 50 µL',
  GoBack = 'Go back',
  Confirm = 'Confirm',
  OpentronsFlex = 'Opentrons Flex',
  OpentronsOT2 = 'Opentrons OT-2',
  LetsGetStarted = 'Let’s start with the basics',
  WhatKindOfRobot = 'What kind of robot do you have?',
  Volume50 = '50 µL',
  Volume1000 = '1000 µL',
  FilterTiprack50 = 'Filter Tip Rack 50 µL',
  Tiprack50 = 'Tip Rack 50 µL',
  Yes = 'Yes',
  No = 'No',
  Thermocycler = 'Thermocycler Module GEN2',
  HeaterShaker = 'Heater-Shaker Module GEN1',
  Tempdeck2 = 'Temperature Module GEN2',
  MagBlock = 'Magnetic Block GEN1',
  PlateReader = 'Absorbance Plate Reader Module GEN1',
  ModulePageH = 'Add your modules',
  ModulePageB = 'Select modules to use in your protocol.',
  EditProtocol = 'Edit protocol',
  EditSlot = 'Edit slot',
  AddLabwareToDeck = 'Add hardware/labware',
  EditHardwareLabwareOnDeck = 'Edit hardware/labware',
  LabwareH = 'Labware',
  WellPlatesCat = 'Well plates',
  AddLiquid = 'Add liquid',
  DefineALiquid = 'Define a liquid',
  LiquidButton = 'Liquid',
  SampleLiquidName = 'My liquid!',
  ProtocolSteps = 'Protocol steps',
  AddStep = 'Add Step',
  NestDeepWell = 'NEST 96 Deep Well Plate 2mL',
  Save = 'Save',
}

export enum SetupLocators {
  Confirm = 'button:contains("Confirm")',
  GoBack = 'button:contains("Go back")',
  Step1Indicator = 'p:contains("Step 1")',
  Step2Indicator = 'p:contains("Step 2")',
  FlexOption = 'button:contains("Opentrons Flex")',
  OT2Option = 'button:contains("Opentrons OT-2")',
  NinetySixChannel = 'div:contains("96-Channel")',
  ThermocyclerImage = 'img[alt="thermocyclerModuleType"]',
  MagblockImage = 'img[alt="magneticBlockType"]',
  HeaterShakerImage = 'img[alt="heaterShakerModuleType"]',
  TemperatureModuleImage = 'img[alt="temperatureModuleType"]',
  LiquidNameInput = 'input[name="displayName"]',
  ModalShellArea = 'div[aria-label="ModalShell_ModalArea"]',
  SaveButton = 'button[type="submit"]',
  LiquidsDropdown = 'div[tabindex="0"].sc-ksBlkl',
  Div = 'div',
  Button = 'button',
  TempdeckTempInput = 'input[name="targetTemperature"]',
  DoneButtonLabwareSelection = '[data-testid="Toolbox_confirmButton"]',

  AspirateWells = 'input[name="aspirate_wells"]',
  div = 'div',
  button = 'button',
  svg = 'svg',
  exist = 'exist',
  StepOptionsTestIDThreeDots = 'button.Btn-sc-o3dtr1-0.OverflowBtn___StyledBtn-sc-1mslfxo-0',
  AspirateCheckbox = 'div.Checkbox___StyledFlex3-sc-1mvp7vt-0.gZwGCw.btdgeU',
}

export const RegexSetupContent = {
  slotText: /Edit (slot|labware)/i,
}

/**
 * Helper function to select a labware by display name.
 * No longer clicks "Done" after selecting.
 */
function selectLabwareByDisplayName(displayName: string): void {
  cy.contains(displayName).click({ force: true })
}
/**
 * chooseDeckSlot is a helper returning a chainable
 * that finds the correct deck slot based on x,y coords in your markup.
 */
function chooseDeckSlot(slot: string): Cypress.Chainable<JQuery<HTMLElement>> {
  const deckSlots: Record<
    | 'A1'
    | 'A2'
    | 'A3'
    | 'B1'
    | 'B2'
    | 'B3'
    | 'C1'
    | 'C2'
    | 'C3'
    | 'D1'
    | 'D2'
    | 'D3',
    () => Cypress.Chainable<JQuery<HTMLElement>>
  > = {
    A1: () => cy.contains('[data-testid="A1"]', RegexSetupContent.slotText),
    A2: () => cy.contains('[data-testid="A2"]', RegexSetupContent.slotText),
    A3: () => cy.contains('[data-testid="A3"]', RegexSetupContent.slotText),
    B1: () => cy.contains('[data-testid="B1"]', RegexSetupContent.slotText),
    B2: () => cy.contains('[data-testid="B2"]', RegexSetupContent.slotText),
    B3: () => cy.contains('[data-testid="B3"]', RegexSetupContent.slotText),
    C1: () => cy.contains('[data-testid="C1"]', RegexSetupContent.slotText),
    C2: () => cy.contains('[data-testid="C2"]', RegexSetupContent.slotText),
    C3: () => cy.contains('[data-testid="C3"]', RegexSetupContent.slotText),
    D1: () => cy.contains('[data-testid="D1"]', RegexSetupContent.slotText),
    D2: () => cy.contains('[data-testid="D2"]', RegexSetupContent.slotText),
    D3: () => cy.contains('[data-testid="D3"]', RegexSetupContent.slotText),
  }

  const slotAction = deckSlots[slot as keyof typeof deckSlots]

  if (typeof slotAction === 'function') {
    return slotAction()
  } else {
    throw new Error(`Slot ${slot} not found in deck slots.`)
  }
}

/**
 * Helper function to select multiple wells (like A1, B3, H12).
 */
function selectWells(wells: string[]): void {
  const wellSelectors: Record<
    string,
    () => Cypress.Chainable<JQuery<HTMLElement>>
  > = {}

  // Dynamically populate (A1..H12)
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
  const columns = Array.from({ length: 12 }, (_, i) => (i + 1).toString())

  rows.forEach(row => {
    columns.forEach(column => {
      const wellName = `${row}${column}`
      wellSelectors[wellName] = () =>
        cy.get(`circle[data-wellname="${wellName}"]`).click({ force: true })
    })
  })

  wells.forEach(well => {
    const wellAction = wellSelectors[well]
    if (typeof wellAction === 'function') {
      wellAction()
    } else {
      throw new Error(`Well ${well} not found.`)
    }
  })
}

/**
 * Each function returns a StepThunk
 * Add a comment to all records
 */
export const SetupSteps = {
  /**
   * Select a labware by display name, then click "Done".
   */
  SelectLabwareByDisplayName: (displayName: string): StepThunk => ({
    call: () => {
      selectLabwareByDisplayName(displayName)

      cy.get(SetupLocators.DoneButtonLabwareSelection).click({ force: true })
    },
  }),

  selectDropdownLabware: (displayName: string): StepThunk => ({
    call: () => {
      selectLabwareByDisplayName(displayName)
    },
  }),

  /**
   * Select the Opentrons Flex option.
   */
  SelectFlex: (): StepThunk => ({
    call: () => {
      cy.contains(SetupContent.OpentronsFlex).should('be.visible').click()
    },
  }),

  /**
   * Select the Opentrons OT-2 option.
   */
  SelectOT2: (): StepThunk => ({
    call: () => {
      cy.contains(SetupContent.OpentronsOT2).should('be.visible').click()
    },
  }),

  /**
   * Click "Confirm".
   */
  Confirm: (): StepThunk => ({
    call: () => {
      cy.contains(SetupContent.Confirm).should('be.visible').click()
    },
  }),

  /**
   * Click "Go back".
   */
  GoBack: (): StepThunk => ({
    call: () => {
      cy.contains(SetupContent.GoBack).should('be.visible').click()
    },
  }),

  /**
   * Select a single-channel pipette with volume 50 µL.
   */
  SingleChannelPipette50: (): StepThunk => ({
    call: () => {
      cy.contains('label', SetupContent.SingleChannel)
        .should('exist')
        .and('be.visible')
        .click()
      cy.contains(SetupContent.Volume50).click()
      cy.contains(SetupContent.Tiprack50).click()
      // optional: cy.contains(SetupContent.FilterTiprack50).click()
    },
  }),

  /**
   * Add a Thermocycler Module GEN2.
   */
  AddThermocycler: (): StepThunk => ({
    call: () => {
      cy.contains(SetupContent.Thermocycler).click()
    },
  }),

  /**
   * Add a Heater-Shaker Module GEN1.
   */
  AddHeaterShaker: (): StepThunk => ({
    call: () => {
      cy.contains(SetupContent.HeaterShaker).click()
    },
  }),

  /**
   * Add a Temperature Module GEN2.
   */
  AddTempdeck2: (): StepThunk => ({
    call: () => {
      cy.contains(SetupContent.Tempdeck2).click()
    },
  }),

  /**
   * Add a Magnetic Block GEN1.
   */
  AddMagBlock: (): StepThunk => ({
    call: () => {
      cy.contains(SetupContent.MagBlock).click()
    },
  }),

  /**
   * Click "Yes" for gripper.
   */
  YesGripper: (): StepThunk => ({
    call: () => {
      cy.contains(SetupContent.Yes).click()
    },
  }),

  /**
   * Click "No" for gripper.
   */
  NoGripper: (): StepThunk => ({
    call: () => {
      cy.contains(SetupContent.No).click()
    },
  }),

  AddPlateReader: (): StepThunk => ({
    call: () => {
      cy.contains(SetupContent.PlateReader).click()
    },
  }),

  /**
   * Click "Edit protocol".
   */
  EditProtocolA: (): StepThunk => ({
    call: () => {
      cy.contains(SetupContent.EditProtocol).click()
    },
  }),

  /**
   * Choose deck slot A1.
   */
  ChoseDeckSlotA1: (): StepThunk => ({
    call: () => {
      chooseDeckSlot('A1').click()
    },
  }),

  /**
   * Choose deck slot A2.
   */
  ChoseDeckSlotA2: (): StepThunk => ({
    call: () => {
      chooseDeckSlot('A2').click()
    },
  }),

  /**
   * Choose deck slot A3.
   */
  ChoseDeckSlotA3: (): StepThunk => ({
    call: () => {
      chooseDeckSlot('A3').click()
    },
  }),

  ChoseDeckSlotC2Labware: (): StepThunk => ({
    call: () => {
      chooseDeckSlot('C2')
        .find('.Box-sc-8ozbhb-0.kIDovv')
        .find('a[role="button"]')
        .contains(RegexSetupContent.slotText)
        .click({ force: true })
    },
  }),
  /**
   * Choose deck slot.
   */
  ChoseDeckSlot: (deckSlot: string): StepThunk => ({
    call: () => {
      chooseDeckSlot(deckSlot).click()
    },
  }),

  /**
   * Adds hardware/labware to a deck slot.
   */
  AddHardwareLabware: (): StepThunk => ({
    call: () => {
      cy.contains(SetupContent.AddLabwareToDeck).click({ force: true })
    },
  }),

  /**
   * Edits existing labware/hardware on a deck slot.
   */
  EditHardwareLabwareOnDeck: (): StepThunk => ({
    call: () => {
      cy.contains(SetupContent.EditHardwareLabwareOnDeck).click()
    },
  }),

  /**
   * Clicks the "Labware" header.
   */
  ClickLabwareHeader: (): StepThunk => ({
    call: () => {
      cy.contains(SetupContent.LabwareH).click()
    },
  }),

  /**
   * Clicks the "Well plates" section.
   */
  ClickWellPlatesSection: (): StepThunk => ({
    call: () => {
      cy.contains(SetupContent.WellPlatesCat).click()
    },
  }),

  /**
   * Choose deck slot C2 with a labware-locating approach.
   */

  ChoseDeckSlotLabware: (deckslot: string): StepThunk => ({
    call: () => {
      chooseDeckSlot(deckslot).click({ force: true })
    },
  }),

  ChoseDeckSlotWithLabware: (deckslot: string): StepThunk => ({
    call: () => {
      chooseDeckSlot(deckslot)
        .find('.Box-sc-8ozbhb-0.kIDovv')
        .find('a[role="button"]')
        .contains(RegexSetupContent.slotText)
        .click({ force: true })
    },
  }),

  /**
   * Clicks the "Add liquid" button.
   */
  AddLiquid: (): StepThunk => ({
    call: () => {
      cy.contains('button', SetupContent.AddLiquid).click()
    },
  }),
  /**
   * Start making a move step
   */

  AddMoveStep: (): StepThunk => ({
    call: () => {
      cy.contains('button', 'Move').should('be.visible').click()
    },
  }),
  /**
   * Select gripper to move with
   */

  UseGripperinMove: (): StepThunk => ({
    call: () => {
      cy.contains('button', 'Use gripper').should('be.visible').click()
    },
  }),
  /**
   * Select gripper to move labware
   */

  MoveToPlateReader: (): StepThunk => ({
    call: () => {
      cy.contains('button', 'Use gripper').should('be.visible').click()
    },
  }),

  /**
   * Clicks the "Liquid" button.
   */
  ClickLiquidButton: (): StepThunk => ({
    call: () => {
      cy.contains('button', SetupContent.LiquidButton).click()
    },
  }),

  /**
   * Clicks the "Define a liquid" button.
   */
  DefineLiquid: (): StepThunk => ({
    call: () => {
      cy.contains('button', SetupContent.DefineALiquid).click()
    },
  }),

  /**
   * Type a sample liquid name, then save.
   */
  LiquidSaveWIP: (): StepThunk => ({
    call: () => {
      cy.get(SetupLocators.LiquidNameInput).type(SetupContent.SampleLiquidName)

      cy.get(SetupLocators.ModalShellArea)
        .find('form')
        .invoke('submit', (e: SubmitEvent) => {
          e.preventDefault()
        })

      cy.get(SetupLocators.ModalShellArea)
        .find(SetupLocators.SaveButton)
        .contains(SetupContent.Save)
        .click({ force: true })
    },
  }),

  /**
   * Select an array of wells (A1, B2, etc.)
   */
  WellSelector: (wells: string[]): StepThunk => ({
    call: () => {
      if (Array.isArray(wells) && wells.length > 0) {
        selectWells(wells)
      } else {
        throw new Error('Wells must be a non-empty array of strings.')
      }
    },
  }),

  /**
   * Opens the liquids dropdown.
   */
  LiquidDropdown: (): StepThunk => ({
    call: () => {
      cy.get(SetupLocators.LiquidsDropdown).should('be.visible').click()
    },
  }),

  /**
   * Select "My liquid!" from the dropdown.
   */
  SelectLiquidWells: (): StepThunk => ({
    call: () => {
      cy.contains('My liquid!').click()
    },
  }),

  /**
   * Sets volume then saves and clicks "Done".
   */
  SetVolumeAndSaveForWells: (volume: string): StepThunk => ({
    call: () => {
      cy.get('input[name="volume"]').type(volume, { force: true })
      cy.contains('button', SetupContent.Save).click()
      cy.contains('button', 'Done').click({ force: true })
    },
  }),

  /**
   * Clicks "Protocol steps" header.
   */
  ProtocolStepsH: (): StepThunk => ({
    call: () => {
      cy.contains('button', SetupContent.ProtocolSteps).click()
    },
  }),

  /**
   * Click the "Add Step" button.
   */
  AddStep: (): StepThunk => ({
    call: () => {
      cy.contains('button', SetupContent.AddStep).click({ force: true })
    },
  }),

  /**
   * Clicks "Adapters" (presumably in a labware context).
   */
  AddAdapters: (): StepThunk => ({
    call: () => {
      cy.contains('Adapters').click()
    },
  }),

  /**
   * Selects "Opentrons 96 Deep Well Temperature Module Adapter".
   */
  DeepWellTempModAdapter: (): StepThunk => ({
    call: () => {
      cy.contains('Opentrons 96 Deep Well Temperature Module Adapter').click()
    },
  }),

  /**
   * Adds "NEST 96 Deep Well Plate 2mL".
   */
  AddNest96DeepWellPlate: (): StepThunk => ({
    call: () => {
      cy.contains(SetupContent.NestDeepWell).click()
    },
  }),

  /**
   * Click "Done" on a step form.
   */
  SelectDone: (): StepThunk => ({
    call: () => {
      cy.get(SetupLocators.DoneButtonLabwareSelection)
        .contains('Done')
        .click({ force: true })
    },
  }),
  /**
   * Chose source labware on a step form
   */
  ChoseSourceLabware: (): StepThunk => ({
    call: () => {
      cy.contains('p', 'Choose option').closest('div[tabindex="0"]').click()
    },
  }),

  // Chose source to move labware on a stepform
  ChoseSourceMoveLabware: (): StepThunk => ({
    call: () => {
      cy.contains('Choose option').eq(0).click()
    },
  }),
  // Chose destination to move labware
  ChoseDestinationMoveLabware: (): StepThunk => ({
    call: () => {
      cy.contains('Choose option').click()
    },
  }),
  // Chose labware being moved to
  ChoseDestinationLabware: (): StepThunk => ({
    call: () => {
      cy.contains('Choose option').click()
    },
  }),
  // Add source labware on stepform
  AddSourceLabwareDropdown: (): StepThunk => ({
    call: () => {
      cy.contains('Source labware')
        .parents()
        .contains('Choose option')
        .should('be.visible')
        .click()
    },
  }),

  // Select destination wells
  SelectSourceWells: (): StepThunk => ({
    call: () => {
      cy.get('input[name="aspirate_wells"]')
        .should('have.value', 'Choose wells')
        .click()
    },
  }),

  // Select destination wells
  SelectDestinationWells: (): StepThunk => ({
    call: () => {
      cy.get('input[name="dispense_wells"]')
        .should('have.value', 'Choose wells')
        .click()
    },
  }),
  // Save selected wells
  SaveSelectedWells: (): StepThunk => ({
    call: () => {
      cy.contains(SetupContent.Save).click({ force: true })
    },
  }),
  // Generic save button
  Save: (): StepThunk => ({
    call: () => {
      cy.contains(SetupContent.Save).click({ force: true })
    },
  }),
  // ToDo Refactor to input any volume

  InputTransferVolume: (TransferVolume: string): StepThunk => ({
    call: () => {
      cy.get('input[name="volume"]').type(TransferVolume)
    },
  }),
  // Continue to the next part of the transfer form
  Continue: (): StepThunk => ({
    call: () => {
      cy.contains('Continue').click()
    },
  }),

  // ToDo @alexjoel42, please combine into one transfer

  // Step 1 Transfer form prewet checkbox
  PrewetAspirate: (): StepThunk => ({
    call: () => {
      cy.contains('Pre-wet tip')
        .closest('div.Flex-sc-1qhp8l7-0.fJriNr')
        .find(SetupLocators.AspirateCheckbox)
        .click()
    },
  }),
  // Step 1 Transfer form Delay

  Delay: (): StepThunk => ({
    call: () => {
      cy.contains('Delay')
        .closest('div')
        .find(SetupLocators.AspirateCheckbox)
        .click()
    },
  }),
  // Step 1 Transfer form touch tip
  TouchTipAspirate: (): StepThunk => ({
    call: () => {
      cy.contains('Touch tip')
        .closest('div')
        .find(SetupLocators.AspirateCheckbox)
        .click()
    },
  }),
  // Step 1 Transfer form mix checkbox
  MixAspirate: (): StepThunk => ({
    call: () => {
      cy.contains('Mix')
        .closest('div')
        .find(SetupLocators.AspirateCheckbox)
        .click()
    },
  }),
  // Step 1 Transfer form airgap checkbox
  AirGap: (): StepThunk => ({
    call: () => {
      cy.contains('Air gap')
        .closest('div')
        .find(SetupLocators.AspirateCheckbox)
        .click()
    },
  }),
  // Step 1 Transfer form mix volume
  AspirateMixVolume: (MixAspirateVolume: string): StepThunk => ({
    call: () => {
      cy.get('input[name = "aspirate_mix_volume"]').type(MixAspirateVolume)
    },
  }),

  AspirateMixTimes: (MixTimesAspirate: string): StepThunk => ({
    call: () => {
      cy.get('input[name = "aspirate_mix_times"]').type(MixTimesAspirate)
    },
  }),

  AspirateAirGapVolume: (AirGapAspirateVolume: string): StepThunk => ({
    call: () => {
      cy.get('input[name = "aspirate_airGap_volume"]').type(
        AirGapAspirateVolume
      )
    },
  }),
  // Select dispense on the transfer form

  SelectDispense: (): StepThunk => ({
    call: () => {
      cy.contains('Dispense').click()
    },
  }),
  // Dispense mix volume
  DispenseMixVolume: (DispenseMixVolume: string): StepThunk => ({
    call: () => {
      cy.get('input[name = "dispense_mix_volume"]').type(DispenseMixVolume)
    },
  }),

  DispenseMixTimes: (): StepThunk => ({
    call: () => {
      cy.get('input[name = "dispense_mix_times"]').type('2')
    },
  }),

  DispenseAirGapVolume: (DispenseAirGapVolume: string): StepThunk => ({
    call: () => {
      cy.get('input[name = "dispense_airGap_volume"]').type(
        DispenseAirGapVolume
      )
    },
  }),

  BlowoutTransferDestination: (): StepThunk => ({
    call: () => {
      cy.contains('Blowout')
        .closest('div.Flex-sc-1qhp8l7-0.ckuVEF')
        .find('button[type="button"]')
        .click()
      cy.contains('Choose option').click()
      cy.contains('Destination Well').click()
    },
  }),

  DeleteSteps: (): StepThunk => ({
    call: () => {
      cy.get(SetupLocators.StepOptionsTestIDThreeDots).click()
      cy.contains('Delete step').click()
      cy.contains('button', 'Delete step').click()
    },
  }),
}

/**
 * Each function returns a StepThunk
 * Add a comment to all records
 */
export const SetupVerifications = {
  /**
   * Verify we are on Step 1.
   */
  OnStep1: (): StepThunk => ({
    call: () => {
      cy.contains(SetupContent.Step1Title).should('be.visible')
    },
  }),

  /**
   * Verify we are on Step 2, and the "Add a pipette" prompt is visible.
   */
  OnStep2: (): StepThunk => ({
    call: () => {
      cy.contains(SetupContent.Step2Title).should('be.visible')
      cy.contains(SetupContent.AddPipette).should('be.visible')
    },
  }),

  /**
   * Verify the Opentrons Flex button is selected (blue background).
   */
  FlexSelected: (): StepThunk => ({
    call: () => {
      cy.contains(SetupContent.OpentronsFlex).should(
        'have.css',
        'background-color',
        'rgb(0, 108, 250)'
      )
    },
  }),

  /**
   * Verify the Opentrons OT-2 button is selected (blue background).
   */
  OT2Selected: (): StepThunk => ({
    call: () => {
      cy.contains(SetupContent.OpentronsOT2).should(
        'have.css',
        'background-color',
        'rgb(0, 108, 250)'
      )
    },
  }),

  /**
   * Verify 96-Channel option is visible.
   */
  NinetySixChannel: (): StepThunk => ({
    call: () => {
      cy.contains(SetupContent.NinetySixChannel).should('be.visible')
    },
  }),

  /**
   * Verify 96-Channel option is *not* visible.
   */
  NotNinetySixChannel: (): StepThunk => ({
    call: () => {
      cy.contains(SetupContent.NinetySixChannel).should('not.exist')
    },
  }),

  /**
   * After selecting 50 µL, verify the volume/rack info is present.
   */
  StepTwo50uL: (): StepThunk => ({
    call: () => {
      cy.contains(SetupContent.PipetteVolume)
      cy.contains(SetupContent.Volume50).should('be.visible')
      cy.contains(SetupContent.Volume1000).should('be.visible')
      cy.contains(SetupContent.Tiprack50).should('be.visible')
      cy.contains(SetupContent.FilterTiprack50).should('be.visible')
    },
  }),

  /**
   * Verify we see the fully named pipette and tiprack, etc.
   */
  StepTwoPart3: (): StepThunk => ({
    call: () => {
      cy.contains(SetupContent.FullP50SingleName).should('be.visible')
      cy.contains(SetupContent.FullP50TiprackName).should('be.visible')
      cy.contains('Left Mount').should('be.visible')
      cy.contains(SetupContent.Step2Title)
      cy.contains('Robot pipettes')
      cy.contains(SetupContent.AddPipette)
    },
  }),

  /**
   * Verify we are on Step 3: "Do you want to move labware automatically with the gripper?"
   */
  OnStep3: (): StepThunk => ({
    call: () => {
      cy.contains('Add a gripper').should('be.visible')
      cy.contains(
        'Do you want to move labware automatically with the gripper?'
      ).should('be.visible')
      cy.contains(SetupContent.Yes).should('be.visible')
      cy.contains(SetupContent.No).should('be.visible')
    },
  }),

  /**
   * Verify Step 4: Module page is visible, with modules listed.
   */
  Step4Verification: (): StepThunk => ({
    call: () => {
      cy.contains(SetupContent.ModulePageH).should('be.visible')
      cy.contains(SetupContent.ModulePageB).should('be.visible')
      cy.contains(SetupContent.Thermocycler).should('be.visible')
      cy.contains(SetupContent.HeaterShaker).should('be.visible')
      cy.contains(SetupContent.MagBlock).should('be.visible')
      cy.contains(SetupContent.Tempdeck2).should('be.visible')
    },
  }),

  /**
   * Verify the Thermocycler image is visible.
   */
  ThermocyclerImg: (): StepThunk => ({
    call: () => {
      cy.get(SetupLocators.ThermocyclerImage).should('be.visible')
    },
  }),

  /**
   * Verify the Heater-Shaker image is visible.
   */
  HeaterShakerImg: (): StepThunk => ({
    call: () => {
      cy.get(SetupLocators.HeaterShakerImage).should('be.visible')
    },
  }),

  /**
   * Verify the Temperature Module GEN2 content is visible.
   */
  Tempdeck2Img: (): StepThunk => ({
    call: () => {
      cy.contains(SetupContent.Tempdeck2).should('be.visible')
    },
  }),

  /**
   * Verify the Liquid page content is visible.
   */
  LiquidPage: (): StepThunk => ({
    call: () => {
      cy.contains('Liquid').should('be.visible')
      cy.contains('Add liquid').should('be.visible')
      cy.contains('Liquid volume by well').should('be.visible')
      cy.contains('Cancel').should('be.visible')
    },
  }),

  AbsorbanceNotSelectable: (): StepThunk => ({
    call: () => {
      cy.contains('button', SetupContent.PlateReader).should('be.disabled')
    },
  }),

  /**
   * Verify you can open the "Transfer" pop-out panel.
   */
  TransferPopOut: (): StepThunk => ({
    call: () => {
      cy.contains('button', 'Transfer').should('be.visible').click()
      cy.contains('Source labware')
      cy.contains('Select source wells')
      cy.contains('Destination labware')
      cy.contains('Volume per well')
      cy.contains('Tip handling')
      cy.contains('Tip drop location')
    },
  }),

  Delay: (): StepThunk => ({
    // Verifies that the "Delay" button has an associated SVG icon with proper attributes
    call: () => {
      cy.contains('Delay')
        .closest('div[data-testid="ListItem_default"]')
        .find('path[aria-roledescription="ot-checkbox"]')
    },
  }),

  PreWet: (): StepThunk => ({
    // Verifies that the "Pre-wet tip" button has an associated SVG icon with proper attributes
    call: () => {
      cy.contains('PreWet')
        .closest('div[data-testid="ListButton_default"]')
        .find('path[aria-roledescription="ot-checkbox"]')
    },
  }),

  TouchTip: (): StepThunk => ({
    // Verifies that the "Touch tip" button has an associated SVG icon with proper attributes
    call: () => {
      cy.contains('Touch tip')
        .closest('div[data-testid="ListItem_default"]')
        .find('path[aria-roledescription="ot-checkbox"]')
    },
  }),

  MixT: (): StepThunk => ({
    // Verifies that the "Mix" button has an associated SVG icon with proper attributes
    call: () => {
      cy.contains('Mix')
        .closest('div[data-testid="ListItem_default"]')
        .find('path[aria-roledescription="ot-checkbox"]')
    },
  }),

  AirGap: (): StepThunk => ({
    // Verifies that the "Air gap" button has an associated SVG icon with proper attributes
    call: () => {
      cy.contains('Air gap')
        .closest('div[data-testid="ListItem_default"]')
        .find('path[aria-roledescription="ot-checkbox"]')
    },
  }),

  ExtraDispenseTransfer: (): StepThunk => ({
    // Verifies that all key elements related to "Blowout" in transfer settings are present
    call: () => {
      cy.contains('Blowout location')
      cy.contains('Blowout flow rate')
      // cy.contains('Blowout position from top')
    },
  }),

  /**
   * Verify the Magnetic Block image is visible.
   */
  MagBlockImg: (): StepThunk => ({
    call: () => {
      cy.get(SetupLocators.MagblockImage).should('be.visible')
    },
  }),
}

/**
 * Helper function that verifies the initial "Create Protocol" page content.
 */
export const verifyCreateProtocolPage = (): void => {
  cy.contains(SetupContent.Step1Title).should('exist').should('be.visible')
  cy.contains(SetupContent.LetsGetStarted).should('exist').should('be.visible')
  cy.contains(SetupContent.WhatKindOfRobot).should('exist').should('be.visible')
  cy.contains(SetupContent.OpentronsFlex).should('exist').should('be.visible')
  cy.contains(SetupContent.OpentronsOT2).should('exist').should('be.visible')
  cy.contains(SetupContent.Confirm).should('exist').should('be.visible')
}

/**
 * Composite, multi-step operations bundled as individual StepThunks
 */
export const CompositeSetupSteps = {
  /**
   * Sets up a Flex protocol with optional modules
   */
  FlexSetup: (options: {
    thermocycler?: boolean
    heatershaker?: boolean
    magblock?: boolean
    tempdeck?: boolean
    platereader?: boolean
  }): StepThunk => ({
    call: () => {
      const thermocycler = options.thermocycler ?? false
      const heatershaker = options.heatershaker ?? false
      const magblock = options.magblock ?? false
      const tempdeck = options.tempdeck ?? false
      const platereader = options.platereader ?? false
      cy.log(`Running FlexSetup with options: ${JSON.stringify(options)}`)
      SetupVerifications.OnStep1().call()
      SetupVerifications.FlexSelected().call()
      UniversalSteps.Snapshot().call()
      SetupSteps.SelectOT2().call()
      SetupVerifications.OT2Selected().call()
      UniversalSteps.Snapshot().call()
      SetupSteps.SelectFlex().call()
      SetupVerifications.FlexSelected().call()
      UniversalSteps.Snapshot().call()
      SetupSteps.Confirm().call()
      SetupVerifications.OnStep2().call()
      SetupSteps.SingleChannelPipette50().call()
      SetupVerifications.StepTwo50uL().call()
      UniversalSteps.Snapshot().call()
      SetupSteps.Confirm().call()
      SetupVerifications.StepTwoPart3().call()
      UniversalSteps.Snapshot().call()
      SetupSteps.Confirm().call()
      SetupVerifications.OnStep3().call()
      SetupSteps.YesGripper().call()
      SetupSteps.Confirm().call()
      SetupVerifications.Step4Verification().call()

      if (thermocycler) {
        SetupSteps.AddThermocycler().call()
        SetupVerifications.ThermocyclerImg().call()
      }

      if (heatershaker) {
        SetupSteps.AddHeaterShaker().call()
        SetupVerifications.HeaterShakerImg().call()
      }

      if (magblock) {
        SetupSteps.AddMagBlock().call()
        SetupVerifications.MagBlockImg().call()
      }

      if (tempdeck) {
        SetupSteps.AddTempdeck2().call()
        SetupVerifications.Tempdeck2Img().call()
      }

      if (platereader) {
        SetupSteps.AddPlateReader().call()
      }

      SetupSteps.Confirm().call()
      SetupSteps.Confirm().call()
      SetupSteps.Confirm().call()
      SetupSteps.EditProtocolA().call()
    },
  }),
  /**
   * Adds labware to a specific deck slot
   */
  AddLabwareToDeckSlot: (
    deckSlot?: string | undefined,
    labwareName?: string | undefined
  ): StepThunk => ({
    call: () => {
      const slotToUse = deckSlot ?? 'C3'
      const labwareToUse = labwareName ?? 'Bio-Rad 96 Well Plate'
      cy.log(
        `Running AddLabwareToDeckSlot with slot ${deckSlot} and labware ${labwareName}`
      )
      SetupSteps.ChoseDeckSlotWithLabware(slotToUse).call()
      SetupSteps.AddHardwareLabware().call()
      SetupSteps.ClickLabwareHeader().call()
      SetupSteps.ClickWellPlatesSection().call()
      SetupSteps.SelectLabwareByDisplayName(labwareToUse).call()
    },
  }),
}
