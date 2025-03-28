describe('The Home Page', () => {
  beforeEach(() => {
    cy.visit('/')
    cy.closeAnalyticsModal()
  })

  it('successfully loads', () => {
    cy.verifyFullHeader()
    cy.verifyHomePage()
  })
})
