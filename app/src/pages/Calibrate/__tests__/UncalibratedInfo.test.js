// @flow
import React from 'react'
import { mount } from 'enzyme'
import { Provider } from 'react-redux'
import { PrimaryBtn } from '@opentrons/components'
import type { State } from '../../../types'

import wellPlate96Def from '@opentrons/shared-data/labware/fixtures/2/fixture_96_plate.json'
import tiprack300Def from '@opentrons/shared-data/labware/fixtures/2/fixture_tiprack_300_ul.json'
import { UncalibratedInfo } from '../UncalibratedInfo'
import { selectors as robotSelectors } from '../../../robot'

import type { TipracksByMountMap, Labware } from '../../../robot/types'

jest.mock('../../../robot/selectors')

const mockGetUnconfirmedLabware: JestMockFn<
  [State],
  $Call<typeof robotSelectors.getUnconfirmedLabware, State>
> = robotSelectors.getUnconfirmedLabware

const leftTiprack = ({
  type: 'some_tiprack',
  definition: tiprack300Def,
  slot: '3',
  name: 'some tiprack',
  calibratorMount: 'left',
  isTiprack: true,
  confirmed: true,
}: $Shape<Labware>)

const rightTiprack = ({
  type: 'some_tiprack',
  definition: tiprack300Def,
  slot: '3',
  name: 'some tiprack',
  calibratorMount: 'right',
  isTiprack: true,
  confirmed: true,
}: $Shape<Labware>)

const stubUnconfirmedLabware = [
  ({
    _id: 123,
    type: 'some_wellplate',
    slot: '4',
    position: null,
    name: 'some wellplate',
    calibratorMount: 'left',
    isTiprack: false,
    confirmed: false,
    isLegacy: false,
    definitionHash: 'some_hash',
    calibration: 'unconfirmed',
    isMoving: false,
    definition: wellPlate96Def,
  }: $Shape<Labware>),
]

describe('UncalibratedInfo', () => {
  let render
  let mockStore
  let dispatch
  let mockUncalibratedInfo: TipracksByMountMap = { left: [], right: [] }

  beforeEach(() => {
    dispatch = jest.fn()
    mockStore = {
      subscribe: () => {},
      getState: () => ({
        robotApi: {},
      }),
      dispatch,
    }
    mockGetUnconfirmedLabware.mockReturnValue(stubUnconfirmedLabware)

    render = (props = {}) => {
      const {
        currentMount = 'left',
        hasCalibrated = true,
        showSpinner = false,
        handleStart = () => {},
      } = props
      return mount(
        <UncalibratedInfo
          uncalibratedTipracksByMount={mockUncalibratedInfo}
          mount={currentMount}
          showSpinner={showSpinner}
          hasCalibrated={hasCalibrated}
          handleStart={handleStart}
        />,
        {
          wrappingComponent: Provider,
          wrappingComponentProps: { store: mockStore },
        }
      )
    }
  })

  afterEach(() => {
    jest.resetAllMocks()
  })
  it('renders calibrate tip length button if hasCalibrated is truthy', () => {
    const wrapper = render({ hasCalibrated: false })
    const component = wrapper.find(`CalibrationInfoContent`)
    expect(
      component.find(`CalibrateButton[title='Calibrate tip length']`).exists()
    ).toBe(true)
  })

  it('renders re-calibrate tip length button if hasCalibrated is truthy', () => {
    const wrapper = render()
    const component = wrapper.find(`CalibrationInfoContent`)
    expect(
      component
        .find(`CalibrateButton[title='Re-Calibrate tip length']`)
        .exists()
    ).toBe(true)
  })

  it('renders move to next labware button if hasCalibrated is truthy and no unconfirmed tipracks', () => {
    const wrapper = render()
    const component = wrapper.find(`CalibrationInfoContent`)
    expect(component.find(PrimaryBtn).prop('children')).toEqual(
      'Continue to labware calibration'
    )
  })

  it('renders move to next labware button if hasCalibrated is truthy and there is a unconfirmed tipracks in the same mount', () => {
    mockUncalibratedInfo = { left: [leftTiprack], right: [] }
    const wrapper = render()
    const component = wrapper.find(`CalibrationInfoContent`)
    expect(component.find(PrimaryBtn).prop('children')).toEqual(
      'Continue to next tip type'
    )
  })

  it('renders move to next labware button if hasCalibrated is truthy and there is a unconfirmed tipracks in the other mount', () => {
    mockUncalibratedInfo = { left: [], right: [rightTiprack] }
    const wrapper = render()
    const component = wrapper.find(`CalibrationInfoContent`)
    expect(component.find(PrimaryBtn).prop('children')).toEqual(
      'Continue to next pipette'
    )
  })
})
