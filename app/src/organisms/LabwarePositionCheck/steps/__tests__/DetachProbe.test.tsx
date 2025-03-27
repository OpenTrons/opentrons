import { describe, expect, it, beforeEach, vi } from 'vitest'
import { screen } from '@testing-library/react'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { MockLPCContentContainer } from '/app/organisms/LabwarePositionCheck/__fixtures__'
import { mockLPCContentProps } from '/app/organisms/LabwarePositionCheck/__fixtures__/mockLPCContentProps'
import { DetachProbe } from '/app/organisms/LabwarePositionCheck/steps'
import {
  selectStepInfo,
  selectActivePipetteChannelCount,
} from '/app/redux/protocol-runs'

import detachProbe1 from '/app/assets/videos/pipette-wizard-flows/Pipette_Detach_Probe_1.webm'
import detachProbe8 from '/app/assets/videos/pipette-wizard-flows/Pipette_Detach_Probe_8.webm'
import detachProbe96 from '/app/assets/videos/pipette-wizard-flows/Pipette_Detach_Probe_96.webm'

import type { ComponentProps } from 'react'
import type { Mock } from 'vitest'

vi.mock('/app/organisms/LabwarePositionCheck/LPCContentContainer', () => ({
  LPCContentContainer: MockLPCContentContainer,
}))

vi.mock('/app/redux/protocol-runs')

const render = (
  props: ComponentProps<typeof DetachProbe>,
  channelCount = 1
) => {
  const mockState = {
    [props.runId]: {
      steps: {
        currentStepIndex: 3,
        totalStepCount: 5,
        protocolName: 'MOCK_PROTOCOL',
      },
      activePipette: {
        channelCount: channelCount,
      },
    },
  }

  return renderWithProviders(<DetachProbe {...props} />, {
    i18nInstance: i18n,
    initialState: mockState,
  })[0]
}

describe('DetachProbe', () => {
  let props: ComponentProps<typeof DetachProbe>
  let mockHandleProceed: Mock

  beforeEach(() => {
    mockHandleProceed = vi.fn()

    vi.mocked(
      selectStepInfo
    ).mockImplementation((runId: string) => (state: any) => state[runId]?.steps)
    vi.mocked(
      selectActivePipetteChannelCount
    ).mockImplementation((runId: string) => (state: any) =>
      state[runId]?.activePipette?.channelCount || 1
    )

    props = {
      ...mockLPCContentProps,
      commandUtils: {
        ...mockLPCContentProps.commandUtils,
        headerCommands: {
          ...mockLPCContentProps.commandUtils.headerCommands,
          handleProceed: mockHandleProceed,
        },
      },
    }
  })

  it('passes correct header props to LPCContentContainer', () => {
    render(props, 1)

    const header = screen.getByTestId('header-prop')
    expect(header).toHaveTextContent('Labware Position Check')

    const primaryButton = screen.getByTestId('primary-button')
    expect(primaryButton).toHaveAttribute('data-button-text', 'Confirm removal')
  })

  it('renders appropriate body content', () => {
    render(props)

    screen.getByText('Remove calibration probe')
    screen.getByText(
      'Before exiting, unlock the calibration probe, remove it from the nozzle, and return it to its storage location.'
    )
  })

  it('displays correct video for single-channel pipette', () => {
    render(props, 1)

    const video = screen.getByTestId('probe-video')
    expect(video).toHaveAttribute('src', detachProbe1)
    expect(video).toHaveAttribute('autoPlay')
    expect(video).toHaveAttribute('loop')
  })

  it('displays correct video for 8-channel pipette', () => {
    render(props, 8)

    const video = screen.getByTestId('probe-video')
    expect(video).toHaveAttribute('src', detachProbe8)
  })

  it('displays correct video for 96-channel pipette', () => {
    render(props, 96)

    const video = screen.getByTestId('probe-video')
    expect(video).toHaveAttribute('src', detachProbe96)
  })

  it('falls back to single-channel video for unexpected channel count', () => {
    render(props, 42)

    const video = screen.getByTestId('probe-video')
    expect(video).toHaveAttribute('src', detachProbe1)
  })
})
