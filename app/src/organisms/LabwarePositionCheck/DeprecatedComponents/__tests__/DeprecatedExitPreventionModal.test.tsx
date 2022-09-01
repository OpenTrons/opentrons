import * as React from 'react'
import { fireEvent } from '@testing-library/react'
import { DeprecatedExitPreventionModal } from '../DeprecatedExitPreventionModal'
import { i18n } from '../../../../i18n'
import { renderWithProviders } from '@opentrons/components'

const render = (
  props: React.ComponentProps<typeof DeprecatedExitPreventionModal>
) => {
  return renderWithProviders(<DeprecatedExitPreventionModal {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('DeprecatedExitPreventionModal', () => {
  let props: React.ComponentProps<typeof DeprecatedExitPreventionModal>
  beforeEach(() => {
    props = { onGoBack: jest.fn(), onConfirmExit: jest.fn() }
  })
  it('should render the correct header', () => {
    const { getByRole } = render(props)
    expect(
      getByRole('heading', {
        name: 'Exit before completing Labware Position Check?',
      })
    ).toBeTruthy()
  })
  it('should render the correct body text', () => {
    const { getByText } = render(props)
    getByText(
      'If you exit now, all labware offsets will be discarded. This cannot be undone.'
    )
  })
  it('should call onGoBack when left button is pressed', () => {
    const { getByRole } = render(props)
    const goBackButton = getByRole('button', {
      name: 'Go back to labware position check',
    })
    fireEvent.click(goBackButton)
    expect(props.onGoBack).toHaveBeenCalled()
  })
  it('should call onConfirmExit when right button is pressed', () => {
    const { getByRole } = render(props)
    const confirmExitButton = getByRole('button', {
      name: 'Exit and discard all labware offsets',
    })
    fireEvent.click(confirmExitButton)
    expect(props.onConfirmExit).toHaveBeenCalled()
  })
})
