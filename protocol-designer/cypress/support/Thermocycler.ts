// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { StepThunk } from './StepBuilder'

enum ThermoContent {
  Cancel = 'Cancel',
  Save = 'Save',
  DeleteStep = 'Delete step',
  DuplicateStep = 'Duplicate step',
  EditStep = 'Edit step',
  Thermocycler = 'Thermocycler',
  Rename = 'Rename',
  ChangeThermoState = 'Change Thermocycler state',
  ProgramThermoProfile = 'Program a Thermocycler profile',
  Continue = 'Continue',
  PartNumber = ' / 2',
  State = 'state',
  Block = 'Block',
  Lid = 'Lid',
  Temperature = 'temperature',
  Position = 'position',
  Deactivate = 'Deactivate',
  Active = 'Active',
  Open = 'Open',
  Closed = 'Closed',
  ProfileSettings = 'Profile settings',
  WellVolume = 'Well volume',
  ProfileSteps = 'Profile steps',
  NoProfileDefined = 'No profile defined',
  EndingHold = 'Ending hold',
  EditProfileSteps = 'Edit Thermocycler profile steps',
  AddCycle = 'Add cycle',
  AddStep = 'Add step',
  NoStepsDefined = 'No steps defined',
}

enum ThermoLocators {
  Button = 'button',
  Div = 'div',
  ThermocyclerEditor = '[data-testid^="StepContainer"]',
  StateBlockTempInput = '[name="blockTargetTemp"]',
  StateLidTempInput = '[name="lidTargetTemp"]',
  ListButton = '[data-testid="ListButton_noActive"]',
  Back = 'button:contains("Back")',
  Save = 'button:contains("Save")',
  Cancel = 'button:contains("Cancel")',
  Delete = 'button:contains("Delete")',
  WellVolumeInput = '[name="profileVolume"]',
  ProfileLidTempInput = '[name="profileTargetLidTemp"]',
  BlockTargetTempHold = '[name="blockTargetTempHold"]',
  LidTargetTempHold = '[name="lidTargetTempHold"]',
  SelectorButton = '[data-testid="EmptySelectorButton_container"]',
  AddCycleStep = 'button:contains("Add a cycle step")',
  ButtonSwitch = 'button[role="switch"]',
  CycleContainer = '[data-testid^="thermocyclerCycle"]',
  ThermocyclerStepContainer = '[data-testid^="thermocyclerStep"]',
  CycleStep = '[data-testid^="cycleStep"]',
  DeleteCycleStepX = 'path[aria-roledescription="close"]',
  AddStepInput = '[class^="InputField"]',
  ModalContainer = '[aria-label="ModalShell_ModalArea"]',
}

/**
 * Each function returns a StepThunk
 * Add a comment to all records
 */

export const ThermocyclerEditor = {
  SelectThermocyclerStep: (): StepThunk => ({
    call: () => {
      cy.contains(ThermoContent.Thermocycler)
        .closest(ThermoLocators.Div)
        .click()
    },
  }),

  /**
   *
   * "Select Thermocycler Duplicate Step"
   */

  DuplicateThermocyclerStep: (): StepThunk => ({
    call: () => {
      cy.contains(ThermoContent.DuplicateStep).click()
    },
  }),

  /**
   *
   * "Select Thermocycler Delete Step"
   */
  DeleteThermocyclerStep: (): StepThunk => ({
    call: () => {
      cy.contains(ThermoContent.DeleteStep).should('be.visible').click()
    },
  }),

  /**
   *
   * "Select Thermocycler Back Button"
   */
  BackButton: (): StepThunk => ({
    call: () => {
      cy.get(ThermoLocators.Back).should('be.visible').click()
    },
  }),

  /**
   *
   * Click profile steps save button
   */
  SaveProfileSteps: (): StepThunk => ({
    call: () => {
      cy.get(ThermoLocators.ModalContainer)
        .find(ThermoLocators.Save)
        .first()
        .should('be.visible')
        .click()
    },
  }),
  /**
   *
   * "Select Thermocycler Save Button"
   */
  SaveButton: (): StepThunk => ({
    call: () => {
      cy.get(ThermoLocators.Save).first().should('be.visible').click()
    },
  }),
  /**
   *
   * "Select Thermocycler Edit Step"
   */
  EditThermocyclerStep: (): StepThunk => ({
    call: () => {
      cy.contains(ThermoContent.EditStep).click()
    },
  }),

  /**
   *
   * "Coupled Thermocycler function for edit, duplicate, delete"
   */

  StepEditor: (stepNumber: string, editOption: string): StepThunk => ({
    call: () => {
      cy.log(
        `*****clicking thermocycler step ${stepNumber} with edit option ${editOption}******`
      )
      cy.contains(`${stepNumber}. ${ThermoContent.Thermocycler}`).click()
      cy.get('[data-testid^="StepContainer"]')
        .contains(`${stepNumber}. ${ThermoContent.Thermocycler}`)
        .parents('[data-testid^="StepContainer"]')
        .find('button[data-testid^="StepContainer"]')
        .click()
      if (editOption === ThermoContent.EditStep) {
        ThermocyclerEditor.EditThermocyclerStep().call()
      } else if (editOption === ThermoContent.DeleteStep) {
        ThermocyclerEditor.DeleteThermocyclerStep().call()
      } else if (editOption === ThermoContent.DuplicateStep) {
        ThermocyclerEditor.DuplicateThermocyclerStep().call()
      }
    },
  }),

  /**
   *
   * "Function for selecting State or Profile"
   */
  SelectProfileOrState: (partOption: string): StepThunk => ({
    call: () => {
      if (partOption === 'state') {
        cy.get('input[id="Change Thermocycler state"]').click({ force: true })
        cy.contains(ThermoContent.Continue).click({ force: true })
      } else if (partOption === 'profile') {
        cy.get('input[id="Program a Thermocycler profile"]').click({
          force: true,
        })
        cy.contains(ThermoContent.Continue).click({ force: true })
      }
    },
  }),

  /**
   * Activates or deactivates Block Temperature.
   *
   * @param input - 'active' to activate, 'deactivate' to deactivate the Block Temperature
   * @returns Cypress StepThunk
   */
  BlockTempOnOff: (input: 'active' | 'deactivate'): StepThunk => ({
    call: () => {
      const shouldBeActive = input === 'active'

      cy.contains(`${ThermoContent.Block} ${ThermoContent.Temperature}`)
        .parents(ThermoLocators.ListButton)
        .find(ThermoLocators.ButtonSwitch)
        .as('blockTempSwitch')

      cy.get('@blockTempSwitch')
        .should('have.attr', 'aria-checked', shouldBeActive ? 'false' : 'true')
        .click()

      cy.get('@blockTempSwitch').should(
        'have.attr',
        'aria-checked',
        shouldBeActive ? 'true' : 'false'
      )
    },
  }),

  /**
   * Activates or deactivates Lid Temperature.
   *
   * @param input - 'active' to activate, 'deactivate' to deactivate the Lid Temperature
   * @returns Cypress StepThunk
   */
  LidTempOnOff: (input: 'active' | 'deactivate'): StepThunk => ({
    call: () => {
      const shouldBeActive = input === 'active'

      cy.get(ThermoLocators.ListButton)
        .contains(`${ThermoContent.Lid} ${ThermoContent.Temperature}`)
        .parents(ThermoLocators.ListButton)
        .find(ThermoLocators.ButtonSwitch)
        .as('lidTempSwitch')

      cy.get('@lidTempSwitch')
        .should('have.attr', 'aria-checked', shouldBeActive ? 'false' : 'true')
        .click()

      cy.get('@lidTempSwitch').should(
        'have.attr',
        'aria-checked',
        shouldBeActive ? 'true' : 'false'
      )
    },
  }),

  /**
   *
   * "Open or Close the TC Lid"
   */
  LidOpenClosed: (input: string): StepThunk => ({
    call: () => {
      if (input === 'open') {
        cy.get(ThermoLocators.ListButton)
          .contains('Lid position')
          .parents(ThermoLocators.ListButton)
          .find(ThermoLocators.ButtonSwitch)
          .as('lidPositionSwitch') // alias the element for safe reuse
        cy.get('@lidPositionSwitch')
          .should('have.attr', 'aria-checked', 'false')
          .click()
        cy.get('@lidPositionSwitch').should('have.attr', 'aria-checked', 'true')
      } else if (input === 'closed') {
        cy.get(ThermoLocators.ListButton)
          .contains('Lid position')
          .parents(ThermoLocators.ListButton)
          .find(ThermoLocators.ButtonSwitch)
          .as('lidPositionSwitch')
        cy.get('@lidPositionSwitch')
          .should('have.attr', 'aria-checked', 'true')
          .click()
        cy.get('@lidPositionSwitch').should(
          'have.attr',
          'aria-checked',
          'false'
        )
      }
    },
  }),
}

export const ThermoState = {
  /**
   *
   * "Input Block Temp"
   */
  BlockTempInput: (value: string): StepThunk => ({
    call: () => {
      cy.get(ThermoLocators.StateBlockTempInput).should('exist').type(value)
    },
  }),

  /**
   *
   * "Input Lid Temp"
   */
  LidTempInput: (value: string): StepThunk => ({
    call: () => {
      cy.get(ThermoLocators.StateLidTempInput).should('exist').type(value)
    },
  }),
}

export const ThermoProfile = {
  /**
   *
   * "Input Well Volume"
   */
  WellVolumeInput: (value: string): StepThunk => ({
    call: () => {
      cy.get(ThermoLocators.WellVolumeInput).should('exist').type(value)
    },
  }),

  /**
   *
   * "Input Lid Temp"
   */
  LidTempInput: (value: string): StepThunk => ({
    call: () => {
      cy.get(ThermoLocators.ProfileLidTempInput).should('exist').type(value)
    },
  }),

  /**
   *
   * "Input Hold Block Temp"
   */
  BlockTempHoldInput: (value: string): StepThunk => ({
    call: () => {
      cy.get(ThermoLocators.BlockTargetTempHold).should('exist').type(value)
    },
  }),

  /**
   *
   * "Input Hold Lid Temp"
   */
  LidTempHoldInput: (value: string): StepThunk => ({
    call: () => {
      cy.get(ThermoLocators.LidTargetTempHold).should('exist').type(value)
    },
  }),
}

const getCycle = (cycle: number): Cypress.Chainable => {
  return cy.get(ThermoLocators.CycleContainer).eq(cycle)
}

const getCycleStep = (cycle: number, step: number): Cypress.Chainable => {
  return getCycle(cycle).find(ThermoLocators.CycleStep).eq(step)
}

const getThermocyclerStep = (step: number): Cypress.Chainable => {
  return cy.get(ThermoLocators.ThermocyclerStepContainer).eq(step)
}

export const ThermoProfileSteps = {
  /**
   *
   * "Add cycle to profile"
   */
  AddCycle: (): StepThunk => ({
    call: () => {
      cy.get(ThermoLocators.SelectorButton)
        .find('p')
        .contains(ThermoContent.AddCycle)
        .click()
    },
  }),

  /**
   *
   * "Add step to profile"
   */
  AddStep: (): StepThunk => ({
    call: () => {
      cy.get(ThermoLocators.SelectorButton)
        .find('p')
        .contains(ThermoContent.AddStep)
        .click()
    },
  }),

  /**
   *
   * "Set cycle count"
   */
  SetCycleCount: (cycle: number, cycleCount: string): StepThunk => ({
    call: () => {
      cy.log(`*****setting cycle count ${cycleCount}******`)
      getCycle(cycle).within(() => {
        cy.get(ThermoLocators.AddStepInput).then($inputs => {
          const inputCount = $inputs.length

          if (inputCount === 4) {
            // Set cycle count in the input at index 3
            cy.wrap($inputs).eq(3).type(cycleCount)
          } else if (inputCount === 1) {
            // Set cycle count in the input at index 0
            cy.wrap($inputs).eq(0).type(cycleCount)
          } else {
            cy.log(`Unexpected input count: ${inputCount}`)
          }
        })
      })
    },
  }),

  /**
   *
   * Fill a Cycle step
   * or add a step to a cycle
   */
  FillCycleStep: ({
    cycle,
    step,
    stepName,
    temp,
    time,
  }: {
    cycle: number
    step: number
    stepName: string
    temp: string
    time: string
  }): StepThunk => ({
    call: () => {
      const values = [stepName, temp, time]
      getCycleStep(cycle, step)
        .find(ThermoLocators.AddStepInput)
        .each(($input, index) => {
          if (index < values.length) {
            // Split the chain and start from cy. to avoid chaining issues
            cy.wrap($input).should('exist').should('be.visible')
            // Start a new command chain for typing
            cy.wrap($input).type(values[index])
          }
        })
    },
  }),

  /**
   *
   * Fill a Step
   * or add a step to a cycle
   */

  FillThermocyclerStep: ({
    step,
    stepName,
    temp,
    time,
  }: {
    step: number
    stepName: string
    temp: string
    time: string
  }): StepThunk => ({
    call: () => {
      const values = [stepName, temp, time]
      getThermocyclerStep(step)
        .find(ThermoLocators.AddStepInput)
        .each(($input, index) => {
          cy.wrap($input)
            .should('exist')
            .should('be.visible')
            .type(values[index])
        })
    },
  }),

  /**
   *
   * "Delete Thermocycler step"
   * specifying the step number
   * to delete
   */
  DeleteThermocyclerStep: (step: number): StepThunk => ({
    call: () => {
      cy.log(`*****clicking X on thermocycler step ${step}******`)
      getThermocyclerStep(step).find(ThermoLocators.Delete).click()
    },
  }),

  /**
   *
   * "Save step"
   */
  SaveThermocyclerStep: (step: number): StepThunk => ({
    call: () => {
      cy.log(`*****clicking Save on  thermocycler step ${step}******`)
      getThermocyclerStep(step).find('button').contains('Save').click()
    },
  }),

  /**
   *
   * "Delete cycle"
   */
  DeleteCycle: (cycle: number): StepThunk => ({
    call: () => {
      cy.log(`*****clicking delete cycle on cycle: ${cycle}******`)
      getCycle(cycle).find('path[aria-roledescription="close"]').click()
    },
  }),

  /**
   *
   * "Save cycle"
   */
  SaveCycle: (step: number): StepThunk => ({
    call: () => {
      cy.log(`*****clicking Save on cycle: ${step}******`)
      getCycle(step).find('button').contains('Save').click()
    },
  }),

  /**
   *
   * "Add cycle step to cycle"
   * specifying the cycle number
   * to add the step to
   */
  AddCycleStep: (cycle: number): StepThunk => ({
    call: () => {
      getCycle(cycle).find(ThermoLocators.AddCycleStep).click()
    },
  }),

  /**
   *
   * "delete cycle step from cycle"
   */
  DeleteCycleStep: (cycle: number, step: number): StepThunk => ({
    call: () => {
      cy.log(`*****clicking delete cycle step ${step}******`)
      getCycleStep(cycle, step).find(ThermoLocators.DeleteCycleStepX).click()
    },
  }),
}

export const ThermoVerifications = {
  /**
   *
   * "Verify step editor menu"
   */
  VerifyStepEditorMenu: (): StepThunk => ({
    call: () => {
      cy.get(ThermoLocators.ThermocyclerEditor).click({ multiple: true })
      cy.contains(ThermoContent.EditStep).should('be.visible')
      cy.contains(ThermoContent.DuplicateStep).should('be.visible')
      cy.contains(ThermoContent.DeleteStep).should('be.visible')
    },
  }),

  /**
   *
   * "Verify TC Header"
   */
  VerifyThermoSetupHeader: (partNum: string): StepThunk => ({
    call: () => {
      cy.contains(`Part ${partNum}${ThermoContent.PartNumber}`)
        .should('exist')
        .should('be.visible')
      cy.contains(ThermoContent.Thermocycler)
        .should('exist')
        .should('be.visible')
      cy.contains(ThermoContent.Rename).should('exist').should('be.visible')
    },
  }),

  /**
   *
   * "Verify delete step pop out"
   */
  VerifyDeleteStep: (): StepThunk => ({
    call: () => {
      cy.contains(ThermoContent.DeleteStep)
      cy.contains('Are you sure you want to delete this step?')
        .should('exist')
        .should('be.visible')
      cy.get('button')
        .contains(ThermoContent.Cancel)
        .should('exist')
        .should('be.visible')
      cy.get('button')
        .contains(ThermoContent.DeleteStep)
        .should('exist')
        .should('be.visible')
        .click()
    },
  }),

  /**
   *
   * "Verify delete step pop out"
   */
  VerifyPartOne: (): StepThunk => ({
    call: () => {
      cy.log(`*****checking part 1 of TC setup******`)
      ThermoVerifications.VerifyThermoSetupHeader('1').call()
      cy.contains(ThermoContent.ChangeThermoState)
        .should('exist')
        .should('be.visible')
      cy.contains(ThermoContent.ProgramThermoProfile)
        .should('exist')
        .should('be.visible')
      cy.contains(ThermoContent.Continue).should('exist').should('be.visible')
    },
  }),

  /**
   *
   * "Verify TC state options"
   */
  VerifyThermoState: (): StepThunk => ({
    call: () => {
      ThermoVerifications.VerifyThermoSetupHeader('2').call()
      cy.contains(`${ThermoContent.Thermocycler} ${ThermoContent.State}`)
        .should('exist')
        .should('be.visible')
      cy.contains(`${ThermoContent.Block} ${ThermoContent.Temperature}`)
        .should('exist')
        .should('be.visible')
        .parent()
        .find('p')
        .contains(ThermoContent.Deactivate)
      cy.contains(`${ThermoContent.Lid} ${ThermoContent.Temperature}`)
        .should('exist')
        .should('be.visible')
        .parent()
        .find('p')
        .contains(ThermoContent.Deactivate)

      cy.get(ThermoLocators.ListButton)
        .find('p')
        .contains(`${ThermoContent.Lid} ${ThermoContent.Position}`)
        .should('exist')
        .should('be.visible')
      cy.get(ThermoLocators.ListButton)
        .find('p')
        .contains(`${ThermoContent.Open}`)
        .should('exist')
        .should('be.visible')
      cy.get('button[aria-label="Deactivate"]').each(($btn, index) => {
        cy.wrap($btn)
          .should('be.visible')
          .and('have.attr', 'aria-checked', 'false')
      })

      cy.get('button[aria-label="Open"]').each(($btn, index) => {
        cy.wrap($btn)
          .should('be.visible')
          .and('have.attr', 'aria-checked', 'true')
      })
    },
  }),

  /**
   *
   * "Verify TC profile options"
   */
  VerifyThermoProfile: (): StepThunk => ({
    call: () => {
      ThermoVerifications.VerifyThermoSetupHeader('2').call()
      cy.contains(ThermoContent.ProfileSettings)
        .should('exist')
        .should('be.visible')
      cy.contains(ThermoContent.WellVolume).should('exist').should('be.visible')
      cy.contains(`${ThermoContent.Lid} ${ThermoContent.Temperature}`)
        .should('exist')
        .should('be.visible')
      cy.contains(`${ThermoContent.Block} ${ThermoContent.Temperature}`)
        .should('exist')
        .should('be.visible')
        .parent()
        .find('p')
        .contains(ThermoContent.Deactivate)
      cy.get(ThermoLocators.ListButton)
        .contains(`${ThermoContent.Lid} ${ThermoContent.Temperature}`)
        .should('exist')
        .should('be.visible')
        .parent()
        .find('p')
        .contains(ThermoContent.Deactivate)
      cy.get(ThermoLocators.ListButton)
        .contains(`${ThermoContent.Lid} ${ThermoContent.Position}`)
        .should('exist')
        .should('be.visible')
      cy.contains(ThermoContent.Closed).should('exist').should('be.visible')
    },
  }),

  /**
   *
   * "Verify state selections persist if you go back and return"
   */
  VerifyOptionsPersist: (partOption: string): StepThunk => ({
    call: () => {
      if (partOption === 'state') {
        cy.get(ThermoLocators.StateBlockTempInput).should('have.prop', 'value')
        cy.get(ThermoLocators.StateLidTempInput).should('have.prop', 'value')
        cy.get(ThermoLocators.ListButton)
          .find('p')
          .contains(`${ThermoContent.Closed}`)
          .should('exist')
          .should('be.visible')
      } else if (partOption === 'profile') {
        cy.get(ThermoLocators.WellVolumeInput).should('have.prop', 'value')
        cy.get(ThermoLocators.ProfileLidTempInput).should('have.prop', 'value')
        cy.get(ThermoLocators.BlockTargetTempHold).should('have.prop', 'value')
        cy.get(ThermoLocators.LidTargetTempHold).should('have.prop', 'value')
        cy.get(ThermoLocators.ListButton)
          .find('p')
          .contains(`${ThermoContent.Open}`)
          .should('exist')
          .should('be.visible')
      }
    },
  }),

  /**
   *
   * "Verify profile pop out page"
   */
  VerifyProfileSteps: (): StepThunk => ({
    call: () => {
      cy.get(ThermoLocators.ListButton)
        .find('p')
        .contains(ThermoContent.NoProfileDefined)
        .click()
      cy.contains(ThermoContent.EditProfileSteps)
        .should('exist')
        .should('be.visible')
      cy.contains(ThermoContent.AddCycle).should('exist').should('be.visible')
      cy.contains(ThermoContent.AddStep).should('exist').should('be.visible')
      cy.contains(ThermoContent.NoStepsDefined)
        .should('exist')
        .should('be.visible')
      cy.get(ThermoLocators.Save).should('exist').should('be.visible')
      cy.get(ThermoLocators.Cancel).should('exist').should('be.visible')
    },
  }),
}
