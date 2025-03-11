import { describe, beforeEach, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'

import { renderWithProviders } from '../../../__testing-utils__'
import { i18n } from '../../../assets/localization'
import { getHasOptedIn } from '../../../analytics/selectors'
import { optIn } from '../../../analytics/actions'

import { GateModal } from '..'

vi.mock('../../../analytics/selectors')
vi.mock('../../../analytics/actions')

const render = () => {
  return renderWithProviders(<GateModal />, {
    i18nInstance: i18n,
  })
}

describe('GateModal', () => {
  beforeEach(() => {
    vi.mocked(getHasOptedIn).mockReturnValue({} as any)
  })

  it('should render text and button', () => {
    render()
    screen.getByText(
      'In order to improve our products, Opentrons would like to collect data related to your use of Protocol Designer. Opentrons will collect and store analytics and session data, including through the use of cookies and similar technologies, solely for the purpose enhancing our products.'
    )
    screen.getByText(
      /You can adjust this setting at any time by clicking on the settings icon. Find detailed information in our/i
    )
    screen.getByText('privacy policy')
    screen.getByText(
      /By using Protocol Designer, you consent to the Opentrons/i
    )
    screen.getByText('EULA')
    screen.getByRole('button', { name: 'Confirm' })
  })

  it('should links to privacy policy and EULA', () => {
    render()
    expect(
      screen.getByRole('link', { name: 'privacy policy' })
    ).toHaveAttribute('href', 'https://opentrons.com/privacy-policy')
    expect(screen.getByRole('link', { name: 'EULA' })).toHaveAttribute(
      'href',
      'https://opentrons.com/eula'
    )
  })

  it('should call analytics optIn action', () => {
    render()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(vi.mocked(optIn)).toHaveBeenCalled()
  })
})
