import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { COLORS } from '@opentrons/components'
import { i18n } from '../../../../../../../assets/localization'
import { renderWithProviders } from '../../../../../../../__testing-utils__'
import { ResetSettingsField } from '../ResetSettingsField'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof ResetSettingsField>) => {
  return renderWithProviders(<ResetSettingsField {...props} />, {
    i18nInstance: i18n,
  })
}

describe('ResetSettingsField', () => {
  let props: ComponentProps<typeof ResetSettingsField>
  beforeEach(() => {
    props = {
      tab: 'aspirate',
      onClick: vi.fn(),
    }
  })

  it('should renders a reset aspirate button', () => {
    render(props)
    screen.getByText('Reset aspirate settings')
    const resetButton = screen.getByRole('button')
    expect(resetButton).toHaveStyle(`background-color: ${COLORS.transparent}`)
    fireEvent.click(resetButton)
    expect(props.onClick).toHaveBeenCalled()
  })
  it('should renders a reset dispense button', () => {
    props.tab = 'dispense'
    render(props)
    screen.getByText('Reset dispense settings')
    const resetButton = screen.getByRole('button')
    expect(resetButton).toHaveStyle(`background-color: ${COLORS.transparent}`)
    fireEvent.click(resetButton)
    expect(props.onClick).toHaveBeenCalled()
  })
})
