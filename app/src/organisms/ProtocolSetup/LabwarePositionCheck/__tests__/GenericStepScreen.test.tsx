import * as React from 'react'
import { when } from 'jest-when'
import {
  partialComponentPropsMatcher,
  renderWithProviders,
} from '@opentrons/components'
import { i18n } from '../../../../i18n'
import { GenericStepScreen } from '../GenericStepScreen'
import { LabwarePositionCheckStepDetail } from '../LabwarePositionCheckStepDetail'
import { PositionCheckNav } from '../PositionCheckNav'
import { useIntroInfo } from '../hooks'
import { Section } from '../types'

jest.mock('../LabwarePositionCheckStepDetail')
jest.mock('../PositionCheckNav')
jest.mock('../hooks')

const mockLabwarePositionCheckStepDetail = LabwarePositionCheckStepDetail as jest.MockedFunction<
  typeof LabwarePositionCheckStepDetail
>
const mockPositionCheckNav = PositionCheckNav as jest.MockedFunction<
  typeof PositionCheckNav
>
const mockUseIntroInfo = useIntroInfo as jest.MockedFunction<
  typeof useIntroInfo
>

const PICKUP_TIP_LABWARE_ID = 'PICKUP_TIP_LABWARE_ID'
const PRIMARY_PIPETTE_ID = 'PRIMARY_PIPETTE_ID'
const MOCK_SECTION = ['PRIMARY_PIPETTE_TIPRACKS' as Section]

const MOCK_LABWARE_POSITION_CHECK_STEP_TIPRACK = {
  labwareId:
    '1d57fc10-67ad-11ea-9f8b-3b50068bd62d:opentrons/opentrons_96_filtertiprack_200ul/1',
  section: '',
  commands: [
    {
      command: 'pickUpTip',
      params: {
        pipette: PRIMARY_PIPETTE_ID,
        labware: PICKUP_TIP_LABWARE_ID,
      },
    },
  ],
} as any

const render = (props: React.ComponentProps<typeof GenericStepScreen>) => {
  return renderWithProviders(<GenericStepScreen {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('GenericStepScreen', () => {
  let props: React.ComponentProps<typeof GenericStepScreen>

  beforeEach(() => {
    props = {
      selectedStep: MOCK_LABWARE_POSITION_CHECK_STEP_TIPRACK,
      setCurrentLabwareCheckStep: () => {},
    }
    when(mockLabwarePositionCheckStepDetail)
      .calledWith(
        partialComponentPropsMatcher({
          selectedStep: MOCK_LABWARE_POSITION_CHECK_STEP_TIPRACK,
        })
      )
      .mockReturnValue(<div>Mock Labware Position Check Step Detail</div>)

    mockPositionCheckNav.mockReturnValue(<div>Mock Position Check Nav</div>)
    when(mockUseIntroInfo).calledWith().mockReturnValue({
      primaryTipRackSlot: '1',
      primaryTipRackName: 'Opentrons 96 Filter Tip Rack 200 µL',
      primaryPipetteMount: 'left',
      secondaryPipetteMount: '',
      numberOfTips: 1,
      firstStepLabwareSlot: '2',
      sections: MOCK_SECTION,
    })
  })
  it('renders LabwarePositionCheckStepDetail component', () => {
    const { getByText } = render(props)
    expect(getByText('Mock Labware Position Check Step Detail')).toBeTruthy()
  })
  it('renders GenericStepScreenNav component', () => {
    const { getByText } = render(props)
    expect(getByText('Mock Position Check Nav')).toBeTruthy()
  })
  it('renders null if useIntroInfo is null', () => {
    mockUseIntroInfo.mockReturnValue(null)
    const { container } = render(props)
    expect(container.firstChild).toBeNull()
  })
})
