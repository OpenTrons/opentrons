import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'

import { i18n } from '../../../assets/localization'
import { renderWithProviders } from '../../../__testing-utils__'
import { EndUserAgreementFooter } from '..'

const render = () => {
  return renderWithProviders(<EndUserAgreementFooter />, { i18nInstance: i18n })
}

const currntYear = new Date().getFullYear()

describe('EndUserAgreementFooter', () => {
  it('should render Footer component', () => {
    render()
    screen.getByText('Privacy policy')
    screen.getByText('End user license agreement')
    screen.getByText(`Copyright © ${currntYear} Opentrons`)
  })

  it('should render links', () => {
    render()
    expect(
      screen.getByRole('link', { name: 'Privacy policy' })
    ).toHaveAttribute('href', 'https://opentrons.com/privacy-policy')
    expect(
      screen.getByRole('link', { name: 'End user license agreement' })
    ).toHaveAttribute('href', 'https://opentrons.com/eula')
  })
})
