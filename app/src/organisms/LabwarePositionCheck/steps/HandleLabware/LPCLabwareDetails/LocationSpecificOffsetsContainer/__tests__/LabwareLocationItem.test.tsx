import { describe, expect, it, beforeEach, vi } from 'vitest'
import { useDispatch } from 'react-redux'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import {
  mockLPCContentProps,
  mockLocationSpecificOffsetDetails,
} from '/app/organisms/LabwarePositionCheck/__fixtures__'
import { LabwareLocationItem } from '/app/organisms/LabwarePositionCheck/steps/HandleLabware/LPCLabwareDetails/LocationSpecificOffsetsContainer/LabwareLocationItem'
import {
  selectMostRecentVectorOffsetForLwWithOffsetDetails,
  selectIsDefaultOffsetAbsent,
  setSelectedLabware,
  proceedEditOffsetSubstep,
  resetLocationSpecificOffsetToDefault,
  OFFSET_KIND_DEFAULT,
  OFFSET_KIND_LOCATION_SPECIFIC,
} from '/app/redux/protocol-runs'
import { useLPCSnackbars } from '/app/organisms/LabwarePositionCheck/hooks'

import type { ComponentProps } from 'react'
import type { Mock } from 'vitest'

const OffsetTagMock = vi.fn(() => <div data-testid="offset-tag" />)
const MultiDeckLabelTagBtnsMock = vi.fn(props => (
  <div data-testid="multi-deck-btns" />
))
vi.mock(
  '/app/organisms/LabwarePositionCheck/steps/HandleLabware/OffsetTag',
  () => ({
    OffsetTag: () => {
      OffsetTagMock()
      return <div data-testid="offset-tag" />
    },
  })
)
vi.mock('/app/molecules/MultiDeckLabelTagBtns', () => ({
  MultiDeckLabelTagBtns: (props: any) => {
    MultiDeckLabelTagBtnsMock(props)
    return <div data-testid="multi-deck-btns" />
  },
}))
// @ts-expect-error -- Just for testing.
vi.mock(import('@opentrons/shared-data'), async importOriginal => {
  const actual = await importOriginal()
  return {
    ...actual,
    getModuleType: vi.fn(moduleModel =>
      moduleModel === 'someModuleModel' ? 'temperatureModule' : ''
    ),
  }
})
vi.mock('react-redux', async () => {
  const actual = await vi.importActual('react-redux')
  return {
    ...actual,
    useDispatch: vi.fn(),
  }
})
vi.mock('/app/redux/protocol-runs', () => ({
  selectMostRecentVectorOffsetForLwWithOffsetDetails: vi.fn(),
  selectIsDefaultOffsetAbsent: vi.fn(),
  setSelectedLabware: vi.fn(),
  proceedEditOffsetSubstep: vi.fn(),
  resetLocationSpecificOffsetToDefault: vi.fn(),
  OFFSET_KIND_DEFAULT: 'default',
  OFFSET_KIND_LOCATION_SPECIFIC: 'location-specific',
}))
vi.mock('/app/organisms/LabwarePositionCheck/hooks')

const render = (props: ComponentProps<typeof LabwareLocationItem>) => {
  return renderWithProviders(<LabwareLocationItem {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('LabwareLocationItem', () => {
  let props: ComponentProps<typeof LabwareLocationItem>
  let mockDispatch: Mock
  let mockToggleRobotMoving: Mock
  let mockHandleCheckItemsPrepModules: Mock
  let mockHardcodedSnackbar: Mock

  beforeEach(() => {
    mockDispatch = vi.fn().mockImplementation(action => action)
    mockToggleRobotMoving = vi.fn().mockResolvedValue(undefined)
    mockHandleCheckItemsPrepModules = vi.fn().mockResolvedValue(undefined)
    mockHardcodedSnackbar = vi.fn()

    vi.mocked(useDispatch).mockReturnValue(mockDispatch)

    props = {
      ...mockLPCContentProps,
      locationSpecificOffsetDetails: {
        ...mockLocationSpecificOffsetDetails[0],
        locationDetails: {
          ...mockLocationSpecificOffsetDetails[0].locationDetails,
          closestBeneathModuleModel: undefined,
          hardCodedOffsetId: null,
        },
      },
      slotCopy: 'C1',
      commandUtils: {
        ...mockLPCContentProps.commandUtils,
        toggleRobotMoving: mockToggleRobotMoving,
        handleCheckItemsPrepModules: mockHandleCheckItemsPrepModules,
      },
    }

    OffsetTagMock.mockClear()
    MultiDeckLabelTagBtnsMock.mockClear()

    vi.mocked(
      selectMostRecentVectorOffsetForLwWithOffsetDetails
    ).mockImplementation(() => () => ({
      kind: OFFSET_KIND_LOCATION_SPECIFIC,
      offset: { x: 0.1, y: 0.2, z: 0.3 },
    }))
    vi.mocked(selectIsDefaultOffsetAbsent).mockImplementation(() => () => false)
    vi.mocked(setSelectedLabware).mockReturnValue({
      type: 'SET_SELECTED_LABWARE',
    } as any)
    vi.mocked(proceedEditOffsetSubstep).mockReturnValue({
      type: 'PROCEED_EDIT_OFFSET_SUBSTEP',
    } as any)
    vi.mocked(resetLocationSpecificOffsetToDefault).mockReturnValue({
      type: 'RESET_OFFSET_TO_DEFAULT',
    } as any)
    vi.mocked(useLPCSnackbars).mockReturnValue({
      makeHardCodedSnackbar: mockHardcodedSnackbar,
    } as any)
  })

  it('renders MultiDeckLabelTagBtns with correct props', () => {
    render(props)

    expect(MultiDeckLabelTagBtnsMock).toHaveBeenCalled()

    const multiDeckBtnsProps = MultiDeckLabelTagBtnsMock.mock.calls[0][0]

    expect(multiDeckBtnsProps.colOneDeckInfoLabels).toHaveLength(1)
    expect(multiDeckBtnsProps.colTwoTag).toBeDefined()
    expect(multiDeckBtnsProps.colThreePrimaryBtn).toEqual(
      expect.objectContaining({
        buttonText: 'Adjust',
        buttonType: 'secondary',
        disabled: false,
      })
    )
    expect(multiDeckBtnsProps.colThreeSecondaryBtn).toEqual(
      expect.objectContaining({
        buttonText: 'Reset to default',
        buttonType: 'tertiaryHighLight',
        disabled: false,
      })
    )
  })

  it('disables the primary button when default offset is missing', () => {
    vi.mocked(selectIsDefaultOffsetAbsent).mockImplementation(() => () => true)

    render(props)

    const multiDeckBtnsProps = MultiDeckLabelTagBtnsMock.mock.calls[0][0]

    expect(multiDeckBtnsProps.colThreePrimaryBtn.disabled).toBe(true)
  })

  it('disables the secondary button when offset is not location-specific', () => {
    vi.mocked(
      selectMostRecentVectorOffsetForLwWithOffsetDetails
    ).mockImplementation(() => () => ({
      kind: OFFSET_KIND_DEFAULT,
      offset: { x: 0.1, y: 0.2, z: 0.3 },
    }))

    render(props)

    const multiDeckBtnsProps = MultiDeckLabelTagBtnsMock.mock.calls[0][0]

    expect(multiDeckBtnsProps.colThreeSecondaryBtn.disabled).toBe(true)
  })

  it('calls the snackbar onClick when buttons tied to a hardcoded offset are pressed', () => {
    props.locationSpecificOffsetDetails = {
      ...props.locationSpecificOffsetDetails,
      locationDetails: {
        ...props.locationSpecificOffsetDetails.locationDetails,
        hardCodedOffsetId: 'some-hardcoded-id',
      },
    }

    render(props)

    const multiDeckBtnsProps = MultiDeckLabelTagBtnsMock.mock.calls[0][0]

    multiDeckBtnsProps.colThreePrimaryBtn.onClick()
    expect(mockHardcodedSnackbar).toHaveBeenCalled()

    mockHardcodedSnackbar.mockClear()

    multiDeckBtnsProps.colThreeSecondaryBtn.onClick()
    expect(mockHardcodedSnackbar).toHaveBeenCalled()
  })
})
