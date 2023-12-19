import * as React from 'react'
import i18next from 'i18next'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithProviders, nestedTextMatcher } from '@opentrons/components'
import {
  getIsLabwareAboveHeight,
  MAX_LABWARE_HEIGHT_EAST_WEST_HEATER_SHAKER_MM,
} from '@opentrons/shared-data'
import {
  ADAPTER_96_CHANNEL,
  getLabwareCompatibleWithAdapter,
} from '../../../utils/labwareModuleCompatibility'
import { LabwareSelectionModal } from '../LabwareSelectionModal'

jest.mock('../../../utils/labwareModuleCompatibility')
jest.mock('../../Hints/useBlockingHint')
jest.mock('@opentrons/shared-data', () => {
  const actualSharedData = jest.requireActual('@opentrons/shared-data')
  return {
    ...actualSharedData,
    getIsLabwareAboveHeight: jest.fn(),
  }
})

const mockGetIsLabwareAboveHeight = getIsLabwareAboveHeight as jest.MockedFunction<
  typeof getIsLabwareAboveHeight
>
const mockGetLabwareCompatibleWithAdapter = getLabwareCompatibleWithAdapter as jest.MockedFunction<
  typeof getLabwareCompatibleWithAdapter
>
const render = (props: React.ComponentProps<typeof LabwareSelectionModal>) => {
  return renderWithProviders(<LabwareSelectionModal {...props} />, {
    i18nInstance: i18next,
  })[0]
}

describe('LabwareSelectionModal', () => {
  let props: React.ComponentProps<typeof LabwareSelectionModal>
  beforeEach(() => {
    props = {
      onClose: jest.fn(),
      onUploadLabware: jest.fn(),
      selectLabware: jest.fn(),
      customLabwareDefs: {},
      permittedTipracks: [],
      isNextToHeaterShaker: false,
      has96Channel: false,
    }
    mockGetLabwareCompatibleWithAdapter.mockReturnValue([])
  })
  it('should NOT filter out labware above 57 mm when the slot is NOT next to a heater shaker', () => {
    props.isNextToHeaterShaker = false
    render(props)
    expect(mockGetIsLabwareAboveHeight).not.toHaveBeenCalled()
  })
  it('should filter out labware above 57 mm when the slot is next to a heater shaker', () => {
    props.isNextToHeaterShaker = true
    render(props)
    expect(mockGetIsLabwareAboveHeight).toHaveBeenCalledWith(
      expect.any(Object),
      MAX_LABWARE_HEIGHT_EAST_WEST_HEATER_SHAKER_MM
    )
  })
  it('should display only permitted tipracks if the 96-channel is attached', () => {
    const mockTipUri = 'fixture/fixture_tiprack_1000_ul/1'
    const mockPermittedTipracks = [mockTipUri]
    props.slot = 'A2'
    props.has96Channel = true
    props.adapterLoadName = ADAPTER_96_CHANNEL
    props.permittedTipracks = mockPermittedTipracks
    render(props)
    fireEvent.click(
      screen.getByText(nestedTextMatcher('adapter compatible labware'))
    )
    screen.getByText('Opentrons GEB 1000uL Tiprack')
  })
})
