// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { StepThunk } from './StepBuilder'

const step = '[data-testid^="StepContainer"]'
const stepButton = `${step} button`

export const TimelineSteps = {
  /**
   *
   * Pass the full title like '1. Thermocycler' or '2. Thermocycler'
   *
   */
  SelectItemMenuOption: (
    title: string,
    option: 'Edit step' | 'Delete step' | 'Duplicate step'
  ): StepThunk => ({
    call: () => {
      cy.contains(title).as('timelineItem')
      cy.get('@timelineItem').click()
      cy.get('@timelineItem').get(stepButton).click()
      cy.contains(option).click()
    },
  }),
}
