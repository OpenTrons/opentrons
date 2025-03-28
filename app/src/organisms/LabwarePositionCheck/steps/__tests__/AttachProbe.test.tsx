import { describe, expect, it, beforeEach, vi } from 'vitest'
import { screen } from '@testing-library/react'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { MockLPCContentContainer } from '/app/organisms/LabwarePositionCheck/__fixtures__'
import { mockLPCContentProps } from '/app/organisms/LabwarePositionCheck/__fixtures__/mockLPCContentProps'
import { AttachProbe } from '/app/organisms/LabwarePositionCheck/steps'
import {
  selectStepInfo,
  selectActivePipetteChannelCount,
} from '/app/redux/protocol-runs'

import attachProbe1 from '/app/assets/videos/pipette-wizard-flows/Pipette_Attach_Probe_1.webm'
import attachProbe8 from '/app/assets/videos/pipette-wizard-flows/Pipette_Attach_Probe_8.webm'
import attachProbe96 from '/app/assets/videos/pipette-wizard-flows/Pipette_Attach_Probe_96.webm'

import type { ComponentProps } from 'react'
import type { Mock } from 'vitest'

vi.mock('/app/organisms/LabwarePositionCheck/LPCContentContainer', () => ({
  LPCContentContainer: MockLPCContentContainer,
}))

vi.mock('/app/redux/protocol-runs')

const render = (
  props: ComponentProps<typeof AttachProbe>,
  channelCount = 1
) => {
  const mockState = {
    [props.runId]: {
      steps: {
        currentStepIndex: 1,
        totalStepCount: 5,
        protocolName: 'MOCK_PROTOCOL',
      },
      activePipette: {
        channelCount: channelCount,
      },
    },
  }

  return renderWithProviders(<AttachProbe {...props} />, {
    i18nInstance: i18n,
    initialState: mockState,
  })[0]
}

describe('AttachProbe', () => {
  let props: ComponentProps<typeof AttachProbe>
  let mockHandleAttachProbeCheck: Mock
  let mockHandleNavToDetachProbe: Mock

  beforeEach(() => {
    mockHandleAttachProbeCheck = vi.fn()
    mockHandleNavToDetachProbe = vi.fn()

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
          handleAttachProbeCheck: mockHandleAttachProbeCheck,
          handleNavToDetachProbe: mockHandleNavToDetachProbe,
        },
      },
    }
  })

  it('passes correct header props to LPCContentContainer', () => {
    render(props, 1)

    const header = screen.getByTestId('header-prop')
    expect(header).toHaveTextContent('Labware Position Check')

    const primaryButton = screen.getByTestId('primary-button')
    expect(primaryButton).toHaveAttribute('data-button-text', 'Continue')

    const secondaryButton = screen.getByTestId('secondary-button')
    expect(secondaryButton).toHaveAttribute('data-text', 'Exit')
  })

  it('renders with single-channel pipette instructions', () => {
    render(props, 1)

    screen.getByText('Attach calibration probe')
    screen.getByText(
      'Take the calibration probe from its storage location. Ensure the collar is fully unlocked. Push the pipette ejector up and press the probe firmly onto the pipette nozzle as far as it can go. Twist the collar to lock the probe.'
    )
    screen.getByText(
      'Test that the probe is secure by gently pulling it back and forth. It should be firmly in place.'
    )
  })

  it('renders with 8-channel pipette instructions', () => {
    render(props, 8)

    screen.getByText('Attach calibration probe')
    screen.getByText(/backmost/i)
    expect(
      screen.queryByText(/A1 \(back left corner\)/i)
    ).not.toBeInTheDocument()
    screen.getByText(
      'Test that the probe is secure by gently pulling it back and forth. It should be firmly in place.'
    )
  })

  it('renders with 96-channel pipette instructions', () => {
    render(props, 96)

    screen.getByText('Attach calibration probe')
    screen.getByText(/A1 \(back left corner\)/i)
    expect(screen.queryByText(/backmost/i)).not.toBeInTheDocument()
    screen.getByText(
      'Test that the probe is secure by gently pulling it back and forth. It should be firmly in place.'
    )
  })

  it('falls back to single-channel instructions for unexpected channel count', () => {
    render(props, 42)

    screen.getByText('Attach calibration probe')
    screen.getByText(
      'Take the calibration probe from its storage location. Ensure the collar is fully unlocked. Push the pipette ejector up and press the probe firmly onto the pipette nozzle as far as it can go. Twist the collar to lock the probe.'
    )
  })

  it('selects correct video source for single-channel pipette', () => {
    render(props, 1)

    const video = screen.getByTestId('probe-video')
    expect(video).toHaveAttribute('src', attachProbe1)
    expect(video).toHaveAttribute('autoPlay')
    expect(video).toHaveAttribute('loop')
  })

  it('selects correct video source for 8-channel pipette', () => {
    render(props, 8)

    const video = screen.getByTestId('probe-video')
    expect(video).toHaveAttribute('src', attachProbe8)
  })

  it('selects correct video source for 96-channel pipette', () => {
    render(props, 96)

    const video = screen.getByTestId('probe-video')
    expect(video).toHaveAttribute('src', attachProbe96)
  })

  it('falls back to single-channel video for unexpected channel count', () => {
    render(props, 42)

    const video = screen.getByTestId('probe-video')
    expect(video).toHaveAttribute('src', attachProbe1)
  })
})
