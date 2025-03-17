// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { StepThunk } from './StepBuilder'

enum MixContent {
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
  WellSelectTitle = 'Select wells using a Flex 1-Channel 1000 µL',
  ClickAndDragWellSelect = 'Click and drag to select wells',
  PipettePreselect = 'Flex 1-Channel 1000 µL',
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
  DelayDuration = 'Delay duration',
  DispFlowRate = 'Dispense flow rate',
  Blowout = 'Blowout',
  TouchTip = 'Touch tip',
  TopBottomLeRi = 'Top to bottom, Left to right',
  EditWellOrder = 'Edit well order',
  WellOrderDescrip = 'Change how the robot moves from well to well.',
  PrimaryOrder = 'Primary order',
  TopToBottom = 'Top to bottom',
  BottomToTop = 'Bottom to top',
  LeftToRight = 'Left to right',
  RightToLeft = 'Right to left',
  Then = 'then',
  SecondaryOrder = 'Secondary order',
  Cancel = 'Cancel',
  EditMixTipPos = 'Edit mix tip position',
  MixTipPosDescr = 'Change from where in the well the robot aspirates and dispenses during the mix.',
  Xposition = 'X position',
  Yposition = 'Y position',
  Zposition = 'Z position',
  StartingWellPos = 'Well position: X 0 Y 0 Z 1 (mm)',
  TopView = 'Top view',
  SideView = 'Side view',
  BlowoutLocation = 'Blowout location',
  BlowoutPos = 'Blowout position from top',
  DestinationWell = 'Destination Well',
  BlowoutFlowRate = 'Blowout position from top',
  EditBlowoutPos = 'Edit blowout position',
  BlowoutPosDescrip = 'Change where in the well the robot performs the blowout.',
  EditTouchTipPos = 'Edit touch tip position',
  TouchTipDescrip = 'Change from where in the well the robot performs the touch tip.',
  TouchTipPos = 'Touch tip position from bottom',
  NameStep = 'Name step',
  StepName = 'Step Name',
  StepNotes = 'Step Notes',
  CypressTest = 'Cypress Mix Test',
  TouchTipFromTop = 'Touch tip position from top',
}

enum MixLocators {
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
  AspFlowRateInput = '[name="aspirate_flowRate"]',
  AspWellOrder = '[data-testid="WellsOrderField_ListButton_aspirate"]',
  ResetToDefault = 'button:contains("Reset to default")',
  PrimaryOrderDropdown = 'div[tabindex="0"].sc-bqWxrE jKLbYH iFjNDq',
  CancelAspSettings = '[class="SecondaryButton-sc-1opt1t9-0 kjpcRL"]',
  MixTipPos = '[data-testid="PositionField_ListButton_mix"]',
  XpositionInput = '[data-testid="TipPositionModal_x_custom_input"]',
  YpositionInput = '[id="TipPositionModal_y_custom_input"]',
  ZpositionInput = '[id="TipPositionModal_z_custom_input"]',
  SwapView = 'button:contains("Swap view")',
  Checkbox = '[class="Flex-sc-1qhp8l7-0 Checkbox___StyledFlex3-sc-1mvp7vt-0 gZwGCw btdgeU"]',
  DelaySecondsInput = '[class="InputField__StyledInput-sc-1gyyvht-0 cLVzBl"]',
  DispFlowRate = '[name="dispense_flowRate"]',
  BlowoutLtnDropdown = '[class="Svg-sc-1lpozsw-0 Icon___StyledSvg-sc-1gt4gyz-0 csSXbR cJpxat"]',
  BlowoutFlowRate = '[name="blowout_flowRate"]',
  BlowoutPos = '[id="TipPositionField_blowout_z_offset"]',
  BlowoutZPosition = '[data-testid="TipPositionModal_custom_input"]',
  PosFromBottom = '[id="TipPositionField_mix_touchTip_mmFromBottom"]',
  RenameBtn = 'button:contains("Rename")',
  StepNameInput = '[class="InputField__StyledInput-sc-1gyyvht-0 cLVzBl"]',
  // StepNotesInput = '[class="TextAreaField__StyledTextArea-sc-1mhuse7-0 hpcyEZ"]',
  StepNotesInput = '[data-testid="TextAreaField"]',
  PosFromTop = '[data-testid="TipPositionField_mix_touchTip_mmFromTop"]',
}

/**
 * Each function returns a StepThunk
 * Add a comment to all records
 */
export const MixSteps = {
  /**
   * "Select Mix"
   */
  SelectMix: (): StepThunk => ({
    call: () => {
      cy.get('button').contains('Mix').click()
    },
  }),

  /**
   * "Select on deck labware"
   */
  SelectLabware: (): StepThunk => ({
    call: () => {
      cy.contains(MixContent.ChooseOption).should('be.visible').click()
      cy.contains(MixContent.Reservoir).should('be.visible').click()
    },
  }),

  /**
   * "Select wells"
   */
  SelectWellInputField: (): StepThunk => ({
    call: () => {
      cy.get(MixLocators.WellInputField).should('be.visible').click()
    },
  }),

  /**
   * "Enter a valid volume to mix"
   */
  EnterVolume: (): StepThunk => ({
    call: () => {
      cy.get(MixLocators.Volume).should('exist').type('100')
    },
  }),

  /**
   * "Enter number of repetitions to mix"
   */
  EnterMixReps: (): StepThunk => ({
    call: () => {
      cy.get(MixLocators.MixReps).should('exist').type('5')
    },
  }),

  /**
   * "Select how/if tips should be picked up for each mix"
   */
  SelectTipHandling: (): StepThunk => ({
    call: () => {
      cy.contains(MixContent.BeforeEveryAsp)
        .should('exist')
        .should('be.visible')
        .click()
      cy.contains(MixContent.OnceAtStartStep)
        .should('exist')
        .should('be.visible')
      cy.contains(MixContent.PerSourceWell).should('exist').should('be.visible')
      cy.contains(MixContent.PerDestWell).should('exist').should('be.visible')
      cy.contains(MixContent.Never).should('exist').should('be.visible')
      cy.contains(MixContent.OnceAtStartStep).click()
    },
  }),

  /**
   * "Select aspirate flow rate settings"
   */
  AspirateFlowRate: (): StepThunk => ({
    call: () => {
      cy.get(MixLocators.Aspirate).should('exist').should('be.visible').click()
      cy.get(MixLocators.AspFlowRateInput).should('exist')
      cy.get(MixLocators.AspFlowRateInput).type('{selectAll}{backspace}100')
    },
  }),

  /**
   * "Open well aspirate well order pop out"
   */
  AspWellOrder: (): StepThunk => ({
    call: () => {
      cy.contains(MixContent.TopBottomLeRi).should('exist').should('be.visible')
      cy.get(MixLocators.AspWellOrder).click()
    },
  }),

  /**
   * "Edit tip position for executing mix step"
   */
  AspMixTipPos: (): StepThunk => ({
    call: () => {
      cy.contains(MixContent.StartingWellPos)
        .should('exist')
        .should('be.visible')
      cy.get(MixLocators.MixTipPos).click()
      cy.get(MixLocators.XpositionInput).type('{selectAll}{backspace}2')
      cy.get(MixLocators.YpositionInput).type('{selectAll}{backspace}3')
      cy.get(MixLocators.ZpositionInput).type('{selectAll}{backspace}4')
      cy.get(MixLocators.ResetToDefault).click()
      cy.get(MixLocators.XpositionInput).type('{selectAll}{backspace}3')
      cy.get(MixLocators.YpositionInput).type('{selectAll}{backspace}2')
      cy.get(MixLocators.ZpositionInput).type('{selectAll}{backspace}5')
      cy.contains(MixContent.Cancel).should('exist').should('be.visible')
    },
  }),

  /**
   * "Check box for delay and input value"
   */
  Delay: (): StepThunk => ({
    call: () => {
      cy.contains(MixContent.Delay).should('exist').should('be.visible')
      cy.get(MixLocators.Checkbox)
        .should('exist')
        .should('be.visible')
        .eq(0)
        .click()
      cy.contains(MixContent.DelayDuration).should('exist').should('be.visible')
      cy.get(MixLocators.DelaySecondsInput)
        .should('exist')
        .should('be.visible')
        .should('have.prop', 'value')
      cy.get(MixLocators.DelaySecondsInput)
        .eq(1)
        .type('{selectAll}{backspace}5')
    },
  }),

  /**
   * "Select dispense settings"
   */
  Dispense: (): StepThunk => ({
    call: () => {
      cy.get(MixLocators.Dispense).should('exist').should('be.visible').click()
    },
  }),

  /**
   * "Select dispense flow rate settings"
   */
  DispenseFlowRate: (): StepThunk => ({
    call: () => {
      cy.get(MixLocators.Dispense).should('exist').should('be.visible').click()
      cy.get(MixLocators.DispFlowRate).should('exist')
      cy.get(MixLocators.DispFlowRate).type('{selectAll}{backspace}300')
    },
  }),

  /**
   * "Select blowout settings"
   */
  BlowoutLocation: (): StepThunk => ({
    call: () => {
      cy.contains(MixContent.Blowout).should('exist').should('be.visible')
      cy.get(MixLocators.Checkbox)
        .should('exist')
        .should('be.visible')
        .eq(0)
        .click()
      cy.contains(MixContent.ChooseOption).should('exist').should('be.visible')
      cy.get(MixLocators.BlowoutLtnDropdown)
        .should('exist')
        .should('be.visible')
        .click()
      cy.contains(MixContent.WasteChute).should('exist').should('be.visible')
      cy.contains(MixContent.DestinationWell)
        .should('exist')
        .should('be.visible')
        .click()
    },
  }),

  /**
   * "Enter value for blow out flow rate"
   */
  BlowoutFlowRate: (): StepThunk => ({
    call: () => {
      cy.get(MixLocators.BlowoutFlowRate)
        .should('exist')
        .should('be.visible')
        .should('have.prop', 'value')
      cy.get(MixLocators.BlowoutFlowRate).click()
      cy.get(MixLocators.BlowoutFlowRate).type('{selectAll}{backspace}300')
    },
  }),

  /**
   * "Select a blow out position from top of well"
   */
  BlowoutPosFromTop: (): StepThunk => ({
    call: () => {
      cy.get(MixLocators.BlowoutPos)
        .should('exist')
        .should('be.visible')
        .should('have.prop', 'value')
      cy.get(MixLocators.BlowoutPos).click()
      cy.get(MixLocators.BlowoutZPosition).type('{selectAll}{backspace}4')
      cy.get(MixLocators.ResetToDefault).click()
      cy.get(MixLocators.BlowoutZPosition).type('{selectAll}{backspace}-3')
    },
  }),

  /**
   * "Select touch tip settings"
   */
  TouchTip: (): StepThunk => ({
    call: () => {
      cy.get(MixLocators.Checkbox)
        .should('exist')
        .should('be.visible')
        .eq(0)
        .click()
      cy.get(MixLocators.PosFromTop)
        .should('exist')
        .should('be.visible')
        .should('have.prop', 'value')
      cy.get(MixLocators.PosFromTop).click({ force: true })
      cy.get(MixLocators.BlowoutZPosition).type('{selectAll}{backspace}2')
      cy.get(MixLocators.ResetToDefault).click()
      cy.get(MixLocators.BlowoutZPosition).type('{selectAll}{backspace}-7')
    },
  }),

  /**
   * "Save"
   */
  Save: (): StepThunk => ({
    call: () => {
      cy.get(MixLocators.Save)
        .should('exist')
        .should('be.visible')
        .first()
        .click({ force: true })
    },
  }),

  /**
   * "Go back"
   */
  Back: (): StepThunk => ({
    call: () => {
      cy.get(MixLocators.Back).should('exist').should('be.visible').click()
    },
  }),

  /**
   * "Continue"
   */
  Continue: (): StepThunk => ({
    call: () => {
      cy.get(MixLocators.Continue)
        .should('exist')
        .should('be.visible')
        .click({ force: true })
    },
  }),

  /**
   * "Rename Mix step"
   */
  Rename: (): StepThunk => ({
    call: () => {
      cy.get(MixLocators.RenameBtn).should('exist').should('be.visible').click()
      cy.contains(MixContent.NameStep).should('exist').should('be.visible')
      cy.contains(MixContent.StepName).should('exist').should('be.visible')
      cy.get(MixLocators.StepNameInput).should('have.value', 'Mix')
      cy.contains(MixContent.StepNotes).should('exist').should('be.visible')
      cy.get(MixLocators.StepNameInput)
        .first()
        .type('{selectAll}{backspace}Cypress Mix Test')
      cy.get(MixLocators.StepNotesInput).type(
        'This is testing cypress automation in PD'
      )
      cy.contains(MixContent.Cancel).should('exist').should('be.visible')
    },
  }),
}

/**
 * MixVerifications: Each function returns a StepThunk, with a doc comment
 * showing the original string from the MixVerifications enum on the right side of the "=".
 */
export const MixVerifications = {
  /**
   * "Verify Part 1, the configuration of mix settings, and check continue button"
   */
  PartOne: (): StepThunk => ({
    call: () => {
      cy.contains(MixContent.PartOne).should('exist').should('be.visible')
      cy.contains(MixContent.Mix).should('exist').should('be.visible')
      cy.contains(MixContent.Pipette).should('exist').should('be.visible')
      cy.contains(MixContent.PipettePreselect)
        .should('exist')
        .should('be.visible')
      cy.contains(MixContent.Tiprack).should('exist').should('be.visible')
      cy.contains(MixContent.TiprackPreselect)
        .should('exist')
        .should('be.visible')
      cy.contains(MixContent.Labware).should('exist').should('be.visible')
      cy.contains(MixContent.SelectWells).should('exist').should('be.visible')
      cy.contains(MixContent.VolumePerWell).should('exist').should('be.visible')
      cy.contains(MixContent.MixRepetitions)
        .should('exist')
        .should('be.visible')
      cy.contains(MixContent.TipHandling).should('exist').should('be.visible')
      cy.contains(MixContent.TipDropLocation)
        .should('exist')
        .should('be.visible')
      cy.contains(MixContent.WasteChute).should('exist').should('be.visible')
      cy.get(MixLocators.Continue).should('exist').should('be.visible')
    },
  }),

  /**
   * "Verify labware image and available wells"
   */
  WellSelectPopout: (): StepThunk => ({
    call: () => {
      cy.contains(MixContent.WellSelectTitle)
        .should('exist')
        .should('be.visible')
      cy.contains(MixContent.ClickAndDragWellSelect)
        .should('exist')
        .should('be.visible')
      cy.get(MixLocators.OneWellReservoirImg)
        .should('exist')
        .should('be.visible')
      cy.get(MixLocators.Save).should('exist').should('be.visible')
      cy.get(MixLocators.Back).should('exist').should('be.visible')
    },
  }),

  /**
   * "Verify Part 2, the configuration of asp settings and check go back and save button"
   */
  PartTwoAsp: (): StepThunk => ({
    call: () => {
      cy.contains(MixContent.PartTwo).should('exist').should('be.visible')
      cy.contains(MixContent.Mix).should('exist').should('be.visible')
      cy.get(MixLocators.Aspirate).should('exist').should('be.visible')
      cy.contains(MixContent.AspFlowRate).should('exist').should('be.visible')
      cy.contains(MixContent.AspWellOrder).should('exist').should('be.visible')
      cy.contains(MixContent.MixTipPosition)
        .should('exist')
        .should('be.visible')
      cy.contains(MixContent.AdvancedPipSettings)
        .should('exist')
        .should('be.visible')
      cy.contains(MixContent.Delay).should('exist').should('be.visible')
      cy.get(MixLocators.Back).should('exist').should('be.visible')
      cy.get(MixLocators.Save).should('exist').should('be.visible')
    },
  }),

  /**
   * "Verify pop out for well order during aspirate"
   */
  AspWellOrder: (): StepThunk => ({
    call: () => {
      cy.contains(MixContent.EditWellOrder).should('exist').should('be.visible')
      cy.contains(MixContent.WellOrderDescrip)
        .should('exist')
        .should('be.visible')
      cy.contains(MixContent.PrimaryOrder).should('exist').should('be.visible')
      cy.contains(MixContent.TopToBottom)
        .should('exist')
        .should('be.visible')
        .click()
      cy.contains(MixContent.BottomToTop).should('exist').should('be.visible')
      cy.contains(MixContent.LeftToRight).should('exist').should('be.visible')
      cy.contains(MixContent.RightToLeft).should('exist').should('be.visible')
      cy.contains(MixContent.BottomToTop).click()
      cy.contains(MixContent.Then).should('exist').should('be.visible')
      cy.contains(MixContent.SecondaryOrder)
        .should('exist')
        .should('be.visible')
      cy.contains(MixContent.LeftToRight).click()
      cy.contains(MixContent.RightToLeft).click()
      cy.get(MixLocators.ResetToDefault).click()
      cy.contains(MixContent.TopToBottom).should('exist').should('be.visible')
      cy.contains(MixContent.LeftToRight).should('exist').should('be.visible')
      cy.get(MixLocators.CancelAspSettings).should('exist').should('be.visible')
      cy.get(MixLocators.Save).should('exist').should('be.visible')
    },
  }),

  /**
   * "Verify pop out for mix tip position during aspirate"
   */
  AspMixTipPos: (): StepThunk => ({
    call: () => {
      cy.contains(MixContent.EditMixTipPos).should('exist').should('be.visible')
      cy.contains(MixContent.MixTipPosDescr)
        .should('exist')
        .should('be.visible')
      cy.contains(MixContent.SideView).should('exist').should('be.visible')
      cy.get(MixLocators.SwapView).should('exist').should('be.visible').click()
      cy.contains(MixContent.TopView).should('exist').should('be.visible')
      cy.contains(MixContent.Xposition).should('exist').should('be.visible')
      cy.get(MixLocators.XpositionInput).should('exist').should('be.visible')
      cy.get(MixLocators.XpositionInput).should('have.prop', 'value')
      cy.contains(MixContent.Yposition).should('exist').should('be.visible')
      cy.get(MixLocators.YpositionInput).should('exist').should('be.visible')
      cy.get(MixLocators.YpositionInput).should('have.prop', 'value')
      cy.contains(MixContent.Zposition).should('exist').should('be.visible')
      cy.get(MixLocators.ZpositionInput).should('exist').should('be.visible')
      cy.get(MixLocators.ZpositionInput).should('have.prop', 'value')
      cy.get(MixLocators.ResetToDefault).should('exist').should('be.visible')
      cy.get(MixLocators.CancelAspSettings).should('exist').should('be.visible')
      cy.get(MixLocators.Save)
        .should('exist')
        .should('be.visible')
        .first()
        .click()
    },
  }),

  /**
   * "Verify Part 2, the configuration of dispense settings and check go back and save button"
   */
  PartTwoDisp: (): StepThunk => ({
    call: () => {
      cy.contains(MixContent.PartTwo).should('exist').should('be.visible')
      cy.contains(MixContent.Mix).should('exist').should('be.visible')
      cy.get(MixLocators.Aspirate).should('exist').should('be.visible')
      cy.get(MixLocators.Dispense).should('exist').should('be.visible')
      cy.contains(MixContent.DispFlowRate).should('exist').should('be.visible')
      cy.get(MixLocators.DispFlowRate).should('have.prop', 'value')
      cy.contains(MixContent.AdvancedPipSettings)
        .should('exist')
        .should('be.visible')
      cy.contains(MixContent.Delay).should('exist').should('be.visible')
      cy.contains(MixContent.Blowout).should('exist').should('be.visible')
      cy.contains(MixContent.TouchTip).should('exist').should('be.visible')
    },
  }),

  /**
   * "Verify blow out settings"
   */
  Blowout: (): StepThunk => ({
    call: () => {
      cy.contains(MixContent.Blowout).should('exist').should('be.visible')
      cy.contains(MixContent.BlowoutLocation)
        .should('exist')
        .should('be.visible')
      cy.contains(MixContent.BlowoutFlowRate)
        .should('exist')
        .should('be.visible')
      cy.get(MixLocators.BlowoutFlowRate).should('have.prop', 'value')
      cy.contains(MixContent.BlowoutPos).should('exist').should('be.visible')
      cy.get(MixLocators.BlowoutPos).should('have.prop', 'value')
    },
  }),

  /**
   * "Verify blow out position and pop out"
   */
  BlowoutPopout: (): StepThunk => ({
    call: () => {
      cy.contains(MixContent.EditBlowoutPos)
        .should('exist')
        .should('be.visible')
      cy.contains(MixContent.BlowoutPosDescrip)
        .should('exist')
        .should('be.visible')
      cy.contains(MixContent.Zposition).should('exist').should('be.visible')
      cy.get(MixLocators.BlowoutZPosition).should('have.prop', 'value')
      cy.contains(MixContent.Cancel).should('exist').should('be.visible')
      cy.get(MixLocators.ResetToDefault).should('exist').should('be.visible')
      cy.get(MixLocators.Save).should('exist').should('be.visible')
    },
  }),

  /**
   * "Verify touch tip settings"
   */
  TouchTip: (): StepThunk => ({
    call: () => {
      cy.contains(MixContent.TouchTip).should('exist').should('be.visible')
      cy.contains(MixContent.TouchTipFromTop)
        .should('exist')
        .should('be.visible')
      cy.get(MixLocators.PosFromTop).should('have.prop', 'value')
    },
  }),

  /**
   * "Verify touch tip pop out"
   */
  TouchTipPopout: (): StepThunk => ({
    call: () => {
      cy.contains(MixContent.EditTouchTipPos)
        .should('exist')
        .should('be.visible')
      cy.contains(MixContent.TouchTipDescrip)
        .should('exist')
        .should('be.visible')
      cy.contains(MixContent.Zposition).should('exist').should('be.visible')
      cy.get(MixLocators.BlowoutZPosition).should('have.prop', 'value')
      cy.contains(MixContent.Cancel).should('exist').should('be.visible')
      cy.get(MixLocators.ResetToDefault).should('exist').should('be.visible')
      cy.get(MixLocators.Save).should('exist').should('be.visible')
    },
  }),

  /**
   * "Verify that Mix Step was successfully renamed to "Cypress Test""
   */
  Rename: (): StepThunk => ({
    call: () => {
      cy.contains(MixContent.CypressTest).should('exist').should('be.visible')
    },
  }),
}
