import { describe, expect, it, beforeEach, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { useDispatch } from 'react-redux'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { mockLPCContentProps } from '/app/organisms/LabwarePositionCheck/__fixtures__'
import { EditOffset } from '/app/organisms/LabwarePositionCheck/steps/HandleLabware/EditOffset'
import {
  selectSelectedLwFlowType,
  selectSelectedLwWithOffsetDetailsMostRecentVectorOffset,
  selectCurrentSubstep,
  selectActivePipette,
  selectStepInfo,
  goBackEditOffsetSubstep,
  proceedEditOffsetSubstep,
  HANDLE_LW_SUBSTEP,
} from '/app/redux/protocol-runs'

import type { ComponentProps } from 'react'
import type { Mock } from 'vitest'

vi.mock(
  '/app/organisms/LabwarePositionCheck/steps/HandleLabware/EditOffset/PrepareLabware',
  () => ({
    PrepareLabware: (props: any) => (
      <div data-testid="mock-prepare-labware" data-header={props.contentHeader}>
        Mock Prepare Labware
      </div>
    ),
  })
)
vi.mock(
  '/app/organisms/LabwarePositionCheck/steps/HandleLabware/EditOffset/CheckLabware',
  () => ({
    CheckLabware: (props: any) => (
      <div data-testid="mock-check-labware" data-header={props.contentHeader}>
        Mock Check Labware
      </div>
    ),
  })
)
vi.mock('react-redux', async () => {
  const actual = await vi.importActual('react-redux')
  return {
    ...actual,
    useDispatch: vi.fn(),
  }
})
vi.mock('/app/redux/protocol-runs', () => ({
  selectSelectedLwFlowType: vi.fn(),
  selectSelectedLwWithOffsetDetailsMostRecentVectorOffset: vi.fn(),
  selectCurrentSubstep: vi.fn(),
  selectActivePipette: vi.fn(),
  selectStepInfo: vi.fn(),
  goBackEditOffsetSubstep: vi.fn(),
  proceedEditOffsetSubstep: vi.fn(),
  HANDLE_LW_SUBSTEP: {
    EDIT_OFFSET_PREP_LW: 'handle-lw/edit-offset/prepare-labware',
    EDIT_OFFSET_CHECK_LW: 'handle-lw/edit-offset/check-labware',
  },
}))

const render = (props: ComponentProps<typeof EditOffset>) => {
  const mockState = {
    [props.runId]: {
      steps: {
        currentStepIndex: 2,
        totalStepCount: 5,
        protocolName: 'MOCK_PROTOCOL',
      },
      activePipette: {
        id: 'some-pipette-id',
        channelCount: 1,
      },
    },
  }

  return renderWithProviders(<EditOffset {...props} />, {
    i18nInstance: i18n,
    initialState: mockState,
  })[0]
}

describe('EditOffset', () => {
  let props: ComponentProps<typeof EditOffset>
  let mockDispatch: Mock

  beforeEach(() => {
    mockDispatch = vi.fn()
    vi.mocked(useDispatch).mockReturnValue(mockDispatch)

    props = {
      ...mockLPCContentProps,
    }

    vi.mocked(
      selectStepInfo
    ).mockImplementation((runId: string) => (state: any) => state[runId]?.steps)
    vi.mocked(
      selectActivePipette
    ).mockImplementation((runId: string) => (state: any) =>
      state[runId]?.activePipette
    )
    vi.mocked(selectSelectedLwFlowType).mockImplementation(() => () =>
      'default'
    )
    vi.mocked(
      selectSelectedLwWithOffsetDetailsMostRecentVectorOffset
    ).mockImplementation(() => () => null)
    vi.mocked(selectCurrentSubstep).mockImplementation(() => () =>
      HANDLE_LW_SUBSTEP.EDIT_OFFSET_PREP_LW
    )
    vi.mocked(goBackEditOffsetSubstep).mockReturnValue({
      type: 'GO_BACK_HANDLE_LW_SUBSTEP',
    } as any)
    vi.mocked(proceedEditOffsetSubstep).mockReturnValue({
      type: 'PROCEED_HANDLE_LW_SUBSTEP',
    } as any)
  })

  describe('content header selection', () => {
    it('shows "add default labware offset" when flow type is default and no offset exists', () => {
      vi.mocked(selectSelectedLwFlowType).mockImplementation(() => () =>
        'default'
      )
      vi.mocked(
        selectSelectedLwWithOffsetDetailsMostRecentVectorOffset
      ).mockImplementation(() => () => null)

      render(props)

      const prepareComponent = screen.getByTestId('mock-prepare-labware')
      expect(prepareComponent.getAttribute('data-header')).toBe(
        'Add default labware offset'
      )
    })

    it('shows "adjust default labware offset" when flow type is default and an offset exists', () => {
      vi.mocked(selectSelectedLwFlowType).mockImplementation(() => () =>
        'default'
      )
      vi.mocked(
        selectSelectedLwWithOffsetDetailsMostRecentVectorOffset
      ).mockImplementation(() => () => ({ x: 0.1, y: 0.2, z: 0.3 }))

      render(props)

      const prepareComponent = screen.getByTestId('mock-prepare-labware')
      expect(prepareComponent.getAttribute('data-header')).toBe(
        'Adjust default labware offset'
      )
    })

    it('shows "adjust applied location offset" when flow type is location-specific', () => {
      vi.mocked(selectSelectedLwFlowType).mockImplementation(() => () =>
        'location-specific'
      )

      render(props)

      const prepareComponent = screen.getByTestId('mock-prepare-labware')
      expect(prepareComponent.getAttribute('data-header')).toBe(
        'Adjust applied location offset'
      )
    })

    it('defaults to "add default labware offset" for unknown flow types', () => {
      vi.mocked(selectSelectedLwFlowType).mockImplementation(() => () =>
        'unknown-type' as any
      )

      render(props)

      const prepareComponent = screen.getByTestId('mock-prepare-labware')
      expect(prepareComponent.getAttribute('data-header')).toBe(
        'Add default labware offset'
      )
    })
  })

  describe('substep rendering', () => {
    it('renders PrepareLabware when on prepare substep', () => {
      vi.mocked(selectCurrentSubstep).mockImplementation(() => () =>
        HANDLE_LW_SUBSTEP.EDIT_OFFSET_PREP_LW
      )

      render(props)

      screen.getByTestId('mock-prepare-labware')
      expect(screen.queryByTestId('mock-check-labware')).not.toBeInTheDocument()
    })

    it('renders CheckLabware when on check substep', () => {
      vi.mocked(selectCurrentSubstep).mockImplementation(() => () =>
        HANDLE_LW_SUBSTEP.EDIT_OFFSET_CHECK_LW
      )

      render(props)

      screen.getByTestId('mock-check-labware')
      expect(
        screen.queryByTestId('mock-prepare-labware')
      ).not.toBeInTheDocument()
    })

    it('renders nothing for unknown substeps', () => {
      vi.mocked(selectCurrentSubstep).mockImplementation(() => () =>
        'unknown-substep' as any
      )

      const { container } = render(props)

      expect(container.textContent).toBe('')
    })
  })
})
