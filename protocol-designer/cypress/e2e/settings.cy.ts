describe('The Settings Page', () => {
  before(() => {
    cy.visit('/')
    cy.closeAnalyticsModal()
  })

  it('content and toggle state', () => {
    // The settings page will not follow the same pattern as create and edit
    // The Settings page is simple enough we need not abstract actions and validations into data

    // home page contains a working settings button
    cy.openSettingsPage()
    cy.verifySettingsPage()
    // Timeline editing tips defaults to true
    cy.getByAriaLabel('Settings_OT_PD_ENABLE_HOT_KEYS_DISPLAY')
      .should('exist')
      .should('be.visible')
      .should('have.attr', 'aria-checked', 'true')
    // Multiple temp modules on OT-2 defaults to false
    cy.getByAriaLabel('Settings_OT_PD_ENABLE_MULTIPLE_TEMPS_OT2')
      .should('exist')
      .should('be.visible')
      .should('have.attr', 'aria-checked', 'false')
    // Disable module restrictions defaults to false
    cy.getByAriaLabel('Settings_OT_PD_DISABLE_MODULE_RESTRICTIONS')
      .should('exist')
      .should('be.visible')
      .should('have.attr', 'aria-checked', 'false')
    // Share sessions with Opentrons toggle defaults to off
    cy.getByTestId('analyticsToggle')
      .should('exist')
      .should('be.visible')
      .find('path[aria-roledescription="ot-toggle-input-on"]')
      .should('exist')
    // Toggle the share sessions with Opentrons setting
    cy.getByTestId('analyticsToggle').click()
    cy.getByTestId('analyticsToggle')
      .find('path[aria-roledescription="ot-toggle-input-off"]')
      .should('exist')
    // Navigate away from the settings page
    // Then return to see privacy toggle remains toggled on
    cy.visit('/')
    cy.openSettingsPage()
    cy.getByAriaLabel('Settings_Privacy').find(
      'path[aria-roledescription="ot-toggle-input-off"]'
    )
    // Toggle off editing timeline tips
    // Navigate away from the settings page
    // Then return to see timeline tips remains toggled on
    cy.getByAriaLabel('Settings_OT_PD_ENABLE_HOT_KEYS_DISPLAY').click()
    cy.getByAriaLabel('Settings_OT_PD_ENABLE_HOT_KEYS_DISPLAY').should(
      'have.attr',
      'aria-checked',
      'false'
    )
    cy.visit('/')
    cy.openSettingsPage()
    cy.getByAriaLabel('Settings_OT_PD_ENABLE_HOT_KEYS_DISPLAY').should(
      'have.attr',
      'aria-checked',
      'false'
    )
  })
})
