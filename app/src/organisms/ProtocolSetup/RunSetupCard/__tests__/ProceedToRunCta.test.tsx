import * as React from 'react'
import { fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { StaticRouter } from 'react-router-dom'
import { when, resetAllWhenMocks } from 'jest-when'
import { renderWithProviders } from '@opentrons/components'
import { useTrackEvent } from '../../../../redux/analytics'
import { i18n } from '../../../../i18n'
import * as hooks from '../hooks'
import { ProceedToRunCta } from '../ProceedToRunCta'
jest.mock('@opentrons/components', () => {
  const actualComponents = jest.requireActual('@opentrons/components')
  return {
    ...actualComponents,
    Tooltip: jest.fn(({ children }) => <div>{children}</div>),
  }
})
jest.mock('../../../../redux/protocol')
jest.mock('../../../../redux/analytics')
jest.mock('../hooks')

const mockUseModuleMatchResults = hooks.useModuleMatchResults as jest.MockedFunction<
  typeof hooks.useModuleMatchResults
>
const mockUseProtocolCalibrationStatus = hooks.useProtocolCalibrationStatus as jest.MockedFunction<
  typeof hooks.useProtocolCalibrationStatus
>

const mockUseTrackEvent = useTrackEvent as jest.MockedFunction<
  typeof useTrackEvent
>

const render = () => {
  return renderWithProviders(
    <StaticRouter>
      <ProceedToRunCta />
    </StaticRouter>,
    {
      i18nInstance: i18n,
    }
  )[0]
}

let mockTrackEvent: jest.Mock

describe('ProceedToRunCta', () => {
  beforeEach(() => {
    mockUseProtocolCalibrationStatus.mockReturnValue({
      complete: true,
    })
    mockTrackEvent = jest.fn()
    when(mockUseTrackEvent).calledWith().mockReturnValue(mockTrackEvent)
  })
  afterEach(() => {
    jest.restoreAllMocks()
    resetAllWhenMocks()
  })

  it('should be enabled with no tooltip if there are no missing Ids', () => {
    mockUseModuleMatchResults.mockReturnValue({
      missingModuleIds: [],
      remainingAttachedModules: [],
    })

    const { getByRole } = render()
    const button = getByRole('button', { name: 'Proceed to run' })
    expect(button).not.toBeDisabled()
  })

  it('should track a mixpanel event when clicked', () => {
    mockUseModuleMatchResults.mockReturnValue({
      missingModuleIds: [],
      remainingAttachedModules: [],
    })
    const { getByRole } = render()
    const button = getByRole('button', { name: 'Proceed to run' })
    fireEvent.click(button)
    expect(mockTrackEvent).toHaveBeenCalledWith({
      name: 'proceedToRun',
      properties: {},
    })
  })

  it('should be disabled with modules not connected tooltip when there are missing moduleIds', () => {
    mockUseModuleMatchResults.mockReturnValue({
      missingModuleIds: ['temperatureModuleV1'],
      remainingAttachedModules: [],
    })
    const { getByRole, getByText } = render()
    const button = getByRole('button', { name: 'Proceed to run' })
    expect(button).toBeDisabled()
    getByText('Make sure all modules are connected before proceeding to run')
  })
  it('should be disabled with modules not connected and calibration not completed tooltip if missing cal and moduleIds', async () => {
    mockUseModuleMatchResults.mockReturnValue({
      missingModuleIds: ['temperatureModuleV1'],
      remainingAttachedModules: [],
    })
    mockUseProtocolCalibrationStatus.mockReturnValue({
      complete: false,
    } as any)
    const { getByRole, getByText } = render()
    const button = getByRole('button', { name: 'Proceed to run' })
    expect(button).toBeDisabled()
    getByText(
      'Make sure robot calibration is complete and all modules are connected before proceeding to run'
    )
  })
  it('should be disabled with calibration not complete tooltip', async () => {
    mockUseModuleMatchResults.mockReturnValue({
      missingModuleIds: [],
      remainingAttachedModules: [],
    })
    mockUseProtocolCalibrationStatus.mockReturnValue({
      complete: false,
    } as any)
    const { getByRole, getByText } = render()
    const button = getByRole('button', { name: 'Proceed to run' })
    expect(button).toBeDisabled()
    getByText(
      'Make sure robot calibration is complete before proceeding to run'
    )
  })
})
