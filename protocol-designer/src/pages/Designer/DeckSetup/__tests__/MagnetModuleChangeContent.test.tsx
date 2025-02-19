import { describe, it } from 'vitest'
import { screen } from '@testing-library/react'
import { i18n } from '/protocol-designer/assets/localization'
import { renderWithProviders } from '/protocol-designer/__testing-utils__'
import { MagnetModuleChangeContent } from '../MagnetModuleChangeContent'

const render = () => {
  return renderWithProviders(<MagnetModuleChangeContent />, {
    i18nInstance: i18n,
  })[0]
}

describe('MagnetModuleChangeContent', () => {
  it('renders the text for the modal content', () => {
    render()
    screen.getByText(
      'Switching between GEN1 and GEN2 Magnetic Modules will clear all non-default engage heights from existing magnet steps in your protocol. GEN1 and GEN2 Magnetic Modules do not use the same units.'
    )
    screen.getByText(
      'To convert engage heights from GEN1 to GEN2, divide your engage height by 2.'
    )
    screen.getByText(
      'To convert engage heights from GEN2 to GEN1, multiply your engage height by 2.'
    )
    screen.getByText(
      'You may also need to alter the time you pause while your magnet is engaged.'
    )
    screen.getByText(
      'Read more about the differences between GEN1 and GEN2 Magnetic Modules'
    )
  })
})
