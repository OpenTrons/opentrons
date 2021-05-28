const isMacOSX = Cypress.platform === 'darwin'
const invalidInput = 'abcdefghijklmnopqrstuvwxyz!@#$%^&*()<>?,-'
const batchEditClickOptions = { [isMacOSX ? 'metaKey' : 'ctrlKey']: true }

function importProtocol() {
  cy.fixture('../../fixtures/protocol/5/mixSettings.json').then(fileContent => {
    cy.get('input[type=file]').upload({
      fileContent: JSON.stringify(fileContent),
      fileName: 'fixture.json',
      mimeType: 'application/json',
      encoding: 'utf8',
    })
    cy.get('[data-test="ComputingSpinner"]').should('exist')
    // wait until computation is done before proceeding, with generous timeout
    cy.get('[data-test="ComputingSpinner"]', { timeout: 30000 }).should(
      'not.exist'
    )
  })
}

function openDesignTab() {
  cy.get('button[id=NavTab_design]').click()
  cy.get('button').contains('ok').click()

  // Verify the Design Page
  cy.get('#TitleBar_main > h1').contains('Multi select banner test protocol')
  cy.get('#TitleBar_main > h2').contains('STARTING DECK STATE')
  cy.get('button[id=StepCreationButton]').contains('+ Add Step')
}

function enterBatchEdit() {
  cy.get('[data-test="StepItem_1"]').click(batchEditClickOptions)
  cy.get('button').contains('exit batch edit').should('exist')
}

describe('Advanced Settings for Mix Form', () => {
  before(() => {
    cy.visit('/')
    cy.closeAnnouncementModal()
    importProtocol()
    openDesignTab()
  })
  it('Verify functionality of mix settings with different labware', () => {
    enterBatchEdit()

    // Different labware disbales aspirate and dispense Flowrate , tipPosition, delay and touchTip
    // step 4 has different labware than step 1
    cy.get('[data-test="StepItem_4"]').click(batchEditClickOptions)

    // well-order is always enabled
    cy.get('[id=WellOrderField_button_mix]').should('be.visible')

    // Aspirate Flowrate disabled
    cy.get('input[name="aspirate_flowRate"]').should('be.disabled')

    // TipPosition Aspirate should be disabled
    cy.get('[id=TipPositionField_mix_mmFromBottom]').should('be.disabled')

    // Dispense Flowrate disbled
    cy.get('input[name="dispense_flowRate"]').should('be.disabled')

    // Delay aspirate & dispense and Touch tip is disabled
    cy.get('input[name="aspirate_delay_checkbox"]').should('be.disabled')
    cy.get('input[name="dispense_delay_checkbox"]').should('be.disabled')
    cy.get('input[name="mix_touchTip_checkbox"]').should('be.disabled')

    // Save button is disabled
    cy.get('button').contains('save').should('be.disabled')

    // Exit batch edit mode
    cy.get('button').contains('exit batch edit').click()
  })
  it('Verify functionality of mix settings with same labware', () => {
    enterBatchEdit()

    // Same labware enables aspirate and dispense Flowrate ,tipPosition ,delay and touchTip
    // deslecting step 4
    cy.get('[data-test="StepItem_4"]').click(batchEditClickOptions)
    // step 2 has same labware as step 1
    cy.get('[data-test="StepItem_2"]').click(batchEditClickOptions)

    // Aspirate Flowrate are enabled
    cy.get('input[name="aspirate_flowRate"]').should('be.enabled')

    // Dispense Flowrate are enabled
    cy.get('input[name="dispense_flowRate"]').should('be.enabled')

    // TipPosition Aspirate should be enabled
    cy.get('[id=TipPositionField_mix_mmFromBottom]').should('be.enabled')

    // Delay in aspirate and Dispense settings is enabled
    cy.get('input[name="aspirate_delay_checkbox"]').should('be.enabled')
    cy.get('input[name="dispense_delay_checkbox"]').should('be.enabled')

    // Touchtip in Dispense settings is enabled
    cy.get('input[name="mix_touchTip_checkbox"]').should('be.enabled')

    // Exit batch edit mode
    cy.get('button').contains('exit batch edit').click()
  })
  it('verify invalid input in delay field', () => {
    // click on step 2 in batch edit mode
    cy.get('[data-test="StepItem_2"]').click(batchEditClickOptions)

    cy.get('input[name="aspirate_delay_checkbox"]').click({ force: true })
    cy.get('input[name="aspirate_delay_seconds"]')
      .type(invalidInput)
      .should('be.empty')

    // click on Discard Changes button to not save the changes
    cy.get('button').contains('discard changes').click()

    // Exit batch edit mode
    cy.get('button').contains('exit batch edit').click()
  })

  it('verify indeterminate state of flowrate', () => {
    // click on step 2 in batch edit mode
    cy.get('[data-test="StepItem_2"]').click(batchEditClickOptions)
    cy.get('input[name="aspirate_flowRate"]').click({ force: true })

    cy.get('div[class*=FlowRateInput__description]').contains(
      'Our default aspirate speed is optimal for a P1000 Single-Channel GEN2 aspirating liquids with a viscosity similar to water'
    )
    cy.get('input[name="aspirate_flowRate_customFlowRate"]').type('100')
    cy.get('button').contains('Done').click()

    // Click save button to save the changes
    cy.get('button').contains('save').click()

    // Click on step 1 as it has flowrate set to 100 from previous testcase
    cy.get('[data-test="StepItem_1"]').click(batchEditClickOptions)

    // indeterminate state in flowrate is empty
    cy.get('input[name="aspirate_flowRate"]').should('have.value', '')
  })

  it('verify functionality of flowrate in batch edit mix form', () => {
    // Batch editing the Flowrate value
    cy.get('input[name="aspirate_flowRate"]').click({ force: true })
    cy.get('div[class*=FlowRateInput__description]').contains(
      'Our default aspirate speed is optimal for a P1000 Single-Channel GEN2 aspirating liquids with a viscosity similar to water'
    )
    cy.get('input[name="aspirate_flowRate_customFlowRate"]').type('100')
    cy.get('button').contains('Done').click()

    // Click save button to save the changes
    cy.get('button').contains('save').click()

    // Exit batch edit mode
    cy.get('button').contains('exit batch edit').click()

    // Click on step 2 to verify that flowrate is updated to 100
    cy.get('[data-test="StepItem_2"]').click()
    cy.get('button[id="AspDispSection_settings_button_aspirate"]').click()

    // Verify that flowrate value
    cy.get('input[name="aspirate_flowRate"]').should('have.value', 100)

    // Click on step 1 to verify that flowrate is updated to 100
    cy.get('[data-test="StepItem_1"]').click()
    cy.get('button[id="AspDispSection_settings_button_aspirate"]').click()

    // Verify that flowrate value
    cy.get('input[name="aspirate_flowRate"]').should('have.value', 100)
  })

  it('verify delay settings indeterminate value', () => {
    // Click on step 2, to enter batch edit mode
    cy.get('[data-test="StepItem_2"]').click(batchEditClickOptions)
    // Select delay settings
    cy.get('input[name="aspirate_delay_checkbox"]')
      .check({ force: true })
      .should('be.checked')
    cy.get('input[name="aspirate_delay_seconds"]').type('2')
    // Click save button to save the changes
    cy.get('button').contains('save').click()
    // Click on step 3 to generate indertminate state for delay settings.
    cy.get('[data-test="StepItem_3"]').click(batchEditClickOptions)
    // Verify the tooltip here
    cy.contains('delay').trigger('pointerover')
    cy.get('div[role="tooltip"]').should(
      'contain',
      'Not all selected steps are using this setting'
    )
    // Exit batch edit mode
    cy.get('button').contains('exit batch edit').click()
  })

  it('verify delay settings batch editing in mix form', () => {
    // Click on step 1, to enter batch edit mode
    cy.get('[data-test="StepItem_1"]').click(batchEditClickOptions)
    // Click on step 2 to batch edit mix settings
    cy.get('[data-test="StepItem_2"]').click(batchEditClickOptions)
    // Select delay settings
    cy.get('input[name="aspirate_delay_checkbox"]').click({ force: true })
    cy.get('input[name="aspirate_delay_seconds"]').clear().type('2')

    // Click save button to save the changes
    cy.get('button').contains('save').click()
    // Exit batch edit mode
    cy.get('button').contains('exit batch edit').click()

    // Click on step 1 to verify that delay has volume set to 2
    cy.get('[data-test="StepItem_1"]').click()
    cy.get('button[id="AspDispSection_settings_button_aspirate"]').click()

    // Verify that volume is set to 2
    cy.get('input[name="aspirate_delay_seconds"]').should('have.value', 2)

    // Click on step 2 to verify that delay has volume set to 2
    cy.get('[data-test="StepItem_2"]').click()
    cy.get('button[id="AspDispSection_settings_button_aspirate"]').click()

    // Verify that volume is set to 2
    cy.get('input[name="aspirate_delay_seconds"]').should('have.value', 2)
  })

  it('verify touchTip settings indeterminate value', () => {
    cy.get('[data-test="StepItem_2"]').click()
    // Click on step 2, to enter batch edit mode
    cy.get('[data-test="StepItem_2"]').click(batchEditClickOptions)
    // Select touchTip settings
    cy.get('input[name="mix_touchTip_checkbox"]').click({ force: true })

    // Click save button to save the changes
    cy.get('button').contains('save').click()
    // Click on step 1 to generate indertminate state for touchTip settings.
    cy.get('[data-test="StepItem_1"]').click(batchEditClickOptions)

    // Verify the tooltip here
    cy.contains('touch tip').trigger('pointerover')
    cy.get('div[role="tooltip"]').should(
      'contain',
      'Not all selected steps are using this setting'
    )
    // Exit batch edit mode
    cy.get('button').contains('exit batch edit').click()
  })

  it('verify touchTip settings batch editing in mix form', () => {
    cy.get('[data-test="StepItem_2"]').click()
    // Click on step 2, to enter batch edit mode
    cy.get('[data-test="StepItem_2"]').click(batchEditClickOptions)
    // Click on step 3 to batch edit mix settings
    cy.get('[data-test="StepItem_3"]').click(batchEditClickOptions)
    // Select touchTip settings
    cy.get('input[name="mix_touchTip_checkbox"]').click({ force: true })
    // cy.get('[id=TipPositionField_mix_touchTip_mmFromBottom]').type('24')
    // Click save button to save the changes
    cy.get('button').contains('save').click()
    // Exit batch edit mode
    cy.get('button').contains('exit batch edit').click()

    // Click on step 2 to verify that touchTip has volume set to 2
    cy.get('[data-test="StepItem_2"]').click()
    cy.get('button[id="AspDispSection_settings_button_dispense"]').click()

    // Verify that volume is set
    cy.get('[id=TipPositionField_mix_touchTip_mmFromBottom]').should(
      'have.value',
      16.4
    )
    // Click on step 1 to verify that touchTip has volume set
    cy.get('[data-test="StepItem_3"]').click()
    cy.get('button[id="AspDispSection_settings_button_dispense"]').click()

    // Verify that volume is set
    cy.get('[id=TipPositionField_mix_touchTip_mmFromBottom]').should(
      'have.value',
      16.4
    )
  })

  it('verify blowout settings indeterminate value', () => {
    // Click on step 2, to enter batch edit mode
    cy.get('[data-test="StepItem_2"]').click(batchEditClickOptions)
    // Select blowout settings
    cy.get('input[name="blowout_checkbox"]').click({ force: true })

    // Click save button to save the changes
    cy.get('button').contains('save').click()
    // Click on step 1 to generate indertminate state for blowout settings.
    cy.get('[data-test="StepItem_1"]').click(batchEditClickOptions)
    // Verify the tooltip here
    cy.contains('blowout').trigger('pointerover')
    cy.get('div[role="tooltip"]').should(
      'contain',
      'Not all selected steps are using this setting'
    )
    // Exit batch edit mode
    cy.get('button').contains('exit batch edit').click()
  })

  it('verify blowout settings batch editing in mix form', () => {
    // Click on step 2, to enter batch edit mode
    cy.get('[data-test="StepItem_2"]').click(batchEditClickOptions)
    // Click on step 3 to batch edit mix settings
    cy.get('[data-test="StepItem_3"]').click(batchEditClickOptions)
    // Select blowout settings
    cy.get('input[name="blowout_checkbox"]').click({ force: true })
    // Click save button to save the changes
    cy.get('button').contains('save').click()
    // Exit batch edit mode
    cy.get('button').contains('exit batch edit').click()

    // Click on step 2 to verify that blowout has trash selected
    cy.get('[data-test="StepItem_2"]').click()
    cy.get('button[id="AspDispSection_settings_button_aspirate"]').click()

    // Verify that trashId is selected
    cy.get('[id=BlowoutLocationField_dropdown]').should('have.value', 'trashId')
    // Click on step 3 to verify the batch editing
    cy.get('[data-test="StepItem_3"]').click()
    cy.get('button[id="AspDispSection_settings_button_aspirate"]').click()

    // Verify that trash is selected for the blowout option
    cy.get('[id=BlowoutLocationField_dropdown]').should('have.value', 'trashId')
  })

  it('verify well-order indeterminate state', () => {
    // Click on step 2, to enter batch edit and click on well order to change the order
    cy.get('[data-test="StepItem_2"]').click(batchEditClickOptions)
    // click on well-order and change the order
    cy.get('[id=WellOrderField_button_mix]').click({ force: true })
    cy.get('h4').contains('Well Order')
    cy.get('p').contains(
      'Change the order in which the robot aspirates from the selected wells'
    )
    cy.get('select[name="mix_wellOrder_first"]')
      .select('Bottom to top')
      .should('have.value', 'b2t')

    cy.get('select[name="mix_wellOrder_second"]')
      .select('Left to right')
      .should('have.value', 'l2r')
    // Click done button to save the changes
    cy.get('button').contains('done').click()
    // Click save button to save the changes
    cy.get('button').contains('save').click()
    // Click on step 1, as it has different well order
    cy.get('[data-test="StepItem_1"]').click(batchEditClickOptions)

    cy.get('[id=WellOrderField_button_mix]').contains('mixed')

    // Exit batch edit mode
    cy.get('button').contains('exit batch edit').click()
  })
})
