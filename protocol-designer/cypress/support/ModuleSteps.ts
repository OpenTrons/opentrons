// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { StepThunk } from './StepBuilder'
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      chooseDeckSlot: (slot: string) => Cypress.Chainable<void>
    }
  }
}

export enum ModLocators {
  DoneButtonLabwareSelection = '[data-testid="Toolbox_confirmButton"]',
  Div = 'div',
  Button = 'button',
  TempdeckTempInput = 'input[name="targetTemperature"]',
}
export enum ModContent {
  ModState = 'Module state',
  DeactivateTempDeck = 'Deactivate',
  Temperature = 'Temperature',
  Save = 'Save',
  Temp4CVerification = `Build a pause step to wait until Temperature Module GEN2 reaches 4˚C`,
  PlateReader = 'Absorbance Plate Reader Module GEN1',
}

/**
 * Each function returns a StepThunk
 * Add a comment to all records
 */
export const ModuleSteps = {
  /**
   * Select "Done" on a step form.
   */
  Done: (): StepThunk => ({
    call: () => {
      cy.get(ModLocators.DoneButtonLabwareSelection)
        .contains('Done')
        .click({ force: true })
    },
  }),

  /**
   * Selects the "Temperature Module" step.
   */
  AddTemperatureStep: (): StepThunk => ({
    call: () => {
      cy.contains('button', 'Temperature').click({ force: true })
    },
  }),

  /**
   * Activates Temperature Module when first used.
   */
  ActivateTempdeck: (): StepThunk => ({
    call: () => {
      cy.contains(ModContent.DeactivateTempDeck)
        .closest(ModLocators.Div)
        .find(ModLocators.Button)
        .click()
    },
  }),

  /**
   * Inputs 4°C into tempdeck.
   */
  InputTempDeck4: (): StepThunk => ({
    call: () => {
      cy.get(ModLocators.TempdeckTempInput).type('4')
    },
  }),

  /**
   * Inputs 95°C into tempdeck.
   */
  InputTempDeck95: (): StepThunk => ({
    call: () => {
      cy.get(ModLocators.TempdeckTempInput).type('95')
    },
  }),

  /**
   * Inputs 100°C into tempdeck; expects an error (then exit).
   */
  InputTempDeck100: (): StepThunk => ({
    call: () => {
      cy.get(ModLocators.TempdeckTempInput).type('100')
    },
  }),

  /**
   * Exits a tempdeck command (no operation).
   */
  ExitTempdeckCommand: (): StepThunk => ({
    call: () => {
      // No operation required
    },
  }),

  /**
   * Pause protocol until the temperature is reached.
   */
  PauseAfterSettingTempdeck: (): StepThunk => ({
    call: () => {
      cy.contains(ModLocators.Button, 'Pause protocol')
        .should('exist')
        .and('be.visible')
        .click()
    },
  }),

  /**
   * Saves a temperature set (click "Save" button).
   */
  SaveButtonTempdeck: (): StepThunk => ({
    call: () => {
      cy.contains(ModContent.Save).click({ force: true })
    },
  }),
  MoveToPlateReader: (): StepThunk => ({
    call: () => {
      cy.contains(ModContent.PlateReader).click()
    },
  }),
  StartPlateReaderStep: (): StepThunk => ({
    call: () => {
      cy.contains('Absorbance Plate Reader').click()
    },
  }),
  DefineInitilizationSingleCheckAll: (): StepThunk => ({
    call: () => {
      // Goes through all the wavelengths
      cy.contains('450 nm (blue)').click()
      cy.contains('562 nm (green)').click()
      cy.contains('562 nm (green)').click()
      cy.contains('600 nm (orange)').click()
      cy.contains('600 nm (orange)').click()
      cy.contains('650 nm (red)').click()
      cy.contains('650 nm (red)').click()
      cy.contains('Other').click()
    },
  }),
  DefineCustomWavelegthSingle: (wavelength: string): StepThunk => ({
    call: () => {
      // Goes through all the wavelengths
      cy.contains('Custom wavelength')
        .parents()
        .find('input.InputField__StyledInput-sc-1gyyvht-0') // ToDo please find better selector
        .type('500')
    },
  }),
}

/**
 * These are your "verifications" as StepThunks.
 */
export const ModuleVerifications = {
  NoMoveToPlateReaderWhenClosed: (): StepThunk => ({
    call: () => {
      cy.contains('Absorbance Plate Reader Module lid closed')
      cy.contains(
        'This step tries to use labware in the Absorbance Plate Reader. Open the lid before this step.'
      )
    },
  }),

  TempeDeckInitialForm: (): StepThunk => ({
    call: () => {
      cy.contains(ModContent.ModState)
      cy.contains(ModContent.DeactivateTempDeck)
      cy.contains(ModContent.Temperature)
    },
  }),

  Temp4CPauseTextVerification: (): StepThunk => ({
    call: () => {
      cy.contains('div', 'Pausing until')
        .should('contain', 'Temperature Module GEN2')
        .and('contain', 'reaches')
        .find('[data-testid="Tag_default"]')
        .should('contain', '4°C')
    },
  }),

  PlateReaderPart1NoInitilization: (): StepThunk => ({
    call: () => {
      cy.contains('Define initialization settings')
      cy.contains('Change lid position')
      cy.contains('Current initialization settings')
      cy.contains('No settings defined')
    },
  }),
  PlateReaderPart2NoInitilization: (): StepThunk => ({
    call: () => {
      cy.contains('Select mode type')
      cy.contains('Single')
      cy.contains('Multi')
      cy.contains('Add reference wavelength?')
    },
  }),
}
