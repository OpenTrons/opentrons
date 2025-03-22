import { describe, it, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../../__testing-utils__'
import { i18n } from '../../../../assets/localization'
import { HotKeyDisplay } from '..'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof HotKeyDisplay>) => {
  return renderWithProviders(<HotKeyDisplay {...props} />, {
    i18nInstance: i18n,
  })
}

describe('HotKeyDisplay', () => {
  let props: ComponentProps<typeof HotKeyDisplay>

  beforeEach(() => {
    props = {
      targetWidth: 285,
    }
  })

  it('renders the hot keys display', () => {
    render(props)
    screen.getByText('Double-click to edit')
    screen.getByText('Shift + click to select range')
    screen.getByText('Command + click to select multiple')
  })
})
