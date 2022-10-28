import * as React from 'react'
import { fireEvent } from '@testing-library/react'
import { renderWithProviders } from '@opentrons/components'
import { LEFT } from '@opentrons/shared-data'
import { i18n } from '../../../i18n'
import {
  mockAttachedPipette,
  mockP300PipetteSpecs,
} from '../../../redux/pipettes/__fixtures__'
import { RUN_ID_1 } from '../../RunTimeControl/__fixtures__'
import { FLOWS } from '../constants'
import { ExitModal } from '../ExitModal'
import type { AttachedPipette } from '../../../redux/pipettes/types'

const render = (props: React.ComponentProps<typeof ExitModal>) => {
  return renderWithProviders(<ExitModal {...props} />, {
    i18nInstance: i18n,
  })[0]
}
const mockPipette: AttachedPipette = {
  ...mockAttachedPipette,
  modelSpecs: mockP300PipetteSpecs,
}

describe('ExitModal', () => {
  let props: React.ComponentProps<typeof ExitModal>

  beforeEach(() => {
    props = {
      mount: LEFT,
      goBack: jest.fn(),
      proceed: jest.fn(),
      chainRunCommands: jest.fn(),
      isRobotMoving: false,
      runId: RUN_ID_1,
      attachedPipette: { left: mockPipette, right: null },
      flowType: FLOWS.CALIBRATE,
    }
  })
  it('returns the correct information for exit modal for calibration flow ', () => {
    const { getByText, getByRole } = render(props)
    getByText('Pipette Calibration progress will be lost')
    getByText(
      'Are you sure you want to exit before completing Pipette Calibration?'
    )
    const back = getByRole('button', { name: 'Go back' })
    const exit = getByRole('button', { name: 'exit' })
    fireEvent.click(back)
    expect(props.goBack).toHaveBeenCalled()
    fireEvent.click(exit)
    expect(props.proceed).toHaveBeenCalled()
  })

  it('returns the correct information for exit modal for attach flow ', () => {
    props = {
      ...props,
      flowType: FLOWS.ATTACH,
    }
    const { getByText, getByRole } = render(props)
    getByText('Attaching Pipette progress will be lost')
    getByText(
      'Are you sure you want to exit before completing Attaching Pipette?'
    )
    const back = getByRole('button', { name: 'Go back' })
    const exit = getByRole('button', { name: 'exit' })
    fireEvent.click(back)
    expect(props.goBack).toHaveBeenCalled()
    fireEvent.click(exit)
    expect(props.proceed).toHaveBeenCalled()
  })

  it('returns the correct information for exit modal for detach flow ', () => {
    props = {
      ...props,
      flowType: FLOWS.DETACH,
    }
    const { getByText, getByRole } = render(props)
    getByText('Detaching Pipette progress will be lost')
    getByText(
      'Are you sure you want to exit before completing Detaching Pipette?'
    )
    const back = getByRole('button', { name: 'Go back' })
    const exit = getByRole('button', { name: 'exit' })
    fireEvent.click(back)
    expect(props.goBack).toHaveBeenCalled()
    fireEvent.click(exit)
    expect(props.proceed).toHaveBeenCalled()
  })
})
