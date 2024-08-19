import * as React from 'react'
import { describe, it, vi, expect, beforeEach } from 'vitest'
import { renderHook, act, screen, fireEvent } from '@testing-library/react'

import { FLEX_ROBOT_TYPE } from '@opentrons/shared-data'

import {
  useProtocolDropTipModal,
  ProtocolDropTipModal,
} from '../ProtocolDropTipModal'
import { renderWithProviders } from '../../../../__testing-utils__'
import { i18n } from '../../../../i18n'
import { mockLeftSpecs } from '../../../../redux/pipettes/__fixtures__'
import { useHomePipettes } from '../../../DropTipWizardFlows/hooks'

import type { Mock } from 'vitest'

vi.mock('../../../DropTipWizardFlows/hooks')

describe('useProtocolDropTipModal', () => {
  let props: Parameters<typeof useProtocolDropTipModal>[0]
  let mockHomePipettes: Mock

  beforeEach(() => {
    props = {
      areTipsAttached: true,
      toggleDTWiz: vi.fn(),
      isRunCurrent: true,
      onSkipAndHome: vi.fn(),
      currentRunId: 'MOCK_ID',
      mount: 'left',
      instrumentModelSpecs: mockLeftSpecs,
      robotType: FLEX_ROBOT_TYPE,
    }
    mockHomePipettes = vi.fn()

    vi.mocked(useHomePipettes).mockReturnValue({
      homePipettes: mockHomePipettes,
      isHomingPipettes: false,
    })
  })

  it('should return initial values', () => {
    const { result } = renderHook(() => useProtocolDropTipModal(props))

    expect(result.current).toEqual({
      showDTModal: true,
      onDTModalSkip: expect.any(Function),
      onDTModalRemoval: expect.any(Function),
      isDisabled: false,
    })
  })

  it('should update showDTModal when areTipsAttached changes', () => {
    const { result, rerender } = renderHook(() =>
      useProtocolDropTipModal(props)
    )

    expect(result.current.showDTModal).toBe(true)

    props.areTipsAttached = false
    rerender()

    expect(result.current.showDTModal).toBe(false)
  })

  it('should not show modal when isRunCurrent is false', () => {
    props.isRunCurrent = false
    const { result } = renderHook(() => useProtocolDropTipModal(props))

    expect(result.current.showDTModal).toBe(false)
  })

  it('should call homePipettes when onDTModalSkip is called', () => {
    const { result } = renderHook(() => useProtocolDropTipModal(props))

    act(() => {
      result.current.onDTModalSkip()
    })

    expect(mockHomePipettes).toHaveBeenCalled()
  })

  it('should call toggleDTWiz when onDTModalRemoval is called', () => {
    const { result } = renderHook(() => useProtocolDropTipModal(props))

    act(() => {
      result.current.onDTModalRemoval()
    })

    expect(props.toggleDTWiz).toHaveBeenCalled()
  })

  it('should set isDisabled to true when isHomingPipettes is true', () => {
    vi.mocked(useHomePipettes).mockReturnValue({
      homePipettes: mockHomePipettes,
      isHomingPipettes: true,
    })

    const { result } = renderHook(() => useProtocolDropTipModal(props))

    expect(result.current.isDisabled).toBe(true)
  })
})

const render = (props: React.ComponentProps<typeof ProtocolDropTipModal>) => {
  return renderWithProviders(<ProtocolDropTipModal {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('ProtocolDropTipModal', () => {
  let props: React.ComponentProps<typeof ProtocolDropTipModal>

  beforeEach(() => {
    props = {
      onSkip: vi.fn(),
      onBeginRemoval: vi.fn(),
      mount: 'left',
      isDisabled: false,
    }
  })

  it('renders the modal with correct content', () => {
    render(props)

    screen.getByText('Remove any attached tips')
    screen.queryByText(
      /Homing the .* pipette with liquid in the tips may damage it\. You must remove all tips before using the pipette again\./
    )
    screen.getByText('Begin removal')
    screen.getByText('Skip and home pipette')
  })

  it('calls onSkip when skip button is clicked', () => {
    render(props)

    fireEvent.click(screen.getByText('Skip and home pipette'))

    expect(props.onSkip).toHaveBeenCalled()
  })

  it('calls onBeginRemoval when begin removal button is clicked', () => {
    render(props)

    fireEvent.click(screen.getByText('Begin removal'))

    expect(props.onBeginRemoval).toHaveBeenCalled()
  })
})
