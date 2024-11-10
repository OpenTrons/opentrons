describe('URL Navigation', () => {
  it('settings', () => {
    cy.visit('#/settings')
    cy.verifySettingsPage()
  })
  it('createNew', () => {
    cy.visit('#/createNew')
    // directly navigating sends you back to the home page
    // TODO: Is this correct?
    cy.verifyHomePage()
  })
  it('overview', () => {
    cy.visit('#/overview')
    // directly navigating sends you back to the home page
    // TODO: Is this correct?
    cy.verifyHomePage()
  })
})
