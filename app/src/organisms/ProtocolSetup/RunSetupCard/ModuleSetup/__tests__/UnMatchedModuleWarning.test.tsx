import * as React from 'react'
import { fireEvent } from '@testing-library/react'
import { i18n } from '../../../../../i18n'
import { UnMatchedModuleWarning } from '../UnMatchedModuleWarning'
import { renderWithProviders } from '@opentrons/components'

const render = (props: React.ComponentProps<typeof UnMatchedModuleWarning>) => {
  return renderWithProviders(<UnMatchedModuleWarning {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('UnMatchedModuleWarning', () => {
  let props: React.ComponentProps<typeof UnMatchedModuleWarning>
  beforeEach(() => {
    props = { isAnyModuleUnnecessary: true }
  })

  it('should render the correct header', () => {
    const { getByRole } = render(props)
    getByRole('heading', {
      name:
        'This robot has connected modules that are not specified in this protocol',
    })
  })
  it('should render the correct body', () => {
    const { getByText } = render(props)
    getByText(
      'If you’re having trouble connecting the modules specifed below, make sure the module’s generation (GEN1 vs GEN2) is correct.'
    )
  })

  it('should close warning when button is clicked', () => {
    const { queryByText, getByRole } = render(props)
    const closeButton = getByRole('button', {
      name: /close/i,
    })
    fireEvent.click(closeButton)
    expect(
      queryByText(
        'This robot has connected modules that are not specified in this protocol'
      )
    ).toBeNull()
  })
})
