import { Footer } from '..'
import { renderWithProviders } from '../../../__testing-utils__'
import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { i18n } from '../../../i18n'

const render = (): ReturnType<typeof renderWithProviders> => {
  return renderWithProviders(<Footer />, {
    i18nInstance: i18n,
  })
}

const currentYear = new Date().getFullYear()
describe('Footer', () => {
  it('should render Footer component', () => {
    render()
    screen.getByText('Privacy policy')
    screen.getByText('End user license agreement')
    screen.getByText(`Copyright © ${currentYear} Opentrons`)
  })

  it('should have a link to the Privacy policy', () => {
    render()
    const privacyPolicy = screen.getByText('Privacy policy')
    expect(privacyPolicy).toHaveAttribute(
      'href',
      'https://insights.opentrons.com/hubfs/Legal%20Documentation/Opentrons-Labworks-Privacy-Policy-5-4-23.docx-1.pdf'
    )
  })

  it('should have a link to the end user license agreement', () => {
    render()
    const eula = screen.getByText('End user license agreement')
    expect(eula).toHaveAttribute(
      'href',
      'https://insights.opentrons.com/hubfs/Legal%20Documentation/Opentrons%20EULA%2020240710.pdf'
    )
  })
})
