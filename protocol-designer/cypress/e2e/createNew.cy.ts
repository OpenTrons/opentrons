import { UniversalSteps } from '../support/UniversalSteps'
import { SetupSteps, SetupVerifications } from '../support/SetupSteps'
import { StepBuilder } from '../support/StepBuilder'

describe('The Redesigned Create Protocol Landing Page', () => {
  beforeEach(() => {
    cy.visit('/')
    cy.closeAnalyticsModal()
  })

  it('Checks onboarding flow for OT-2', () => {
    cy.verifyCreateNewHeader()
    cy.clickCreateNew()
    const steps: StepBuilder = new StepBuilder()
    steps.add(SetupVerifications.OnStep1())
    steps.add(SetupVerifications.FlexSelected())
    steps.add(UniversalSteps.Snapshot())
    steps.add(SetupSteps.SelectOT2())
    steps.add(SetupVerifications.OT2Selected())
    steps.add(UniversalSteps.Snapshot())
    steps.add(SetupSteps.SelectFlex())
    steps.add(SetupVerifications.FlexSelected())
    steps.add(UniversalSteps.Snapshot())
    steps.add(SetupSteps.Confirm())
    steps.add(SetupVerifications.OnStep2())
    steps.add(SetupVerifications.NinetySixChannel())
    steps.add(UniversalSteps.Snapshot())
    steps.add(SetupSteps.GoBack())
    steps.add(SetupVerifications.OnStep1())
    steps.add(SetupSteps.SelectOT2())
    steps.add(SetupSteps.Confirm())
    steps.add(SetupVerifications.OnStep2())
    steps.add(SetupVerifications.NotNinetySixChannel())
    steps.add(UniversalSteps.Snapshot())
    steps.execute()
  })
})
