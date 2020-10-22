// @flow
import * as React from 'react'
import { mount } from 'enzyme'
import * as Sessions from '../../../sessions'
import * as Fixtures from '../../../sessions/__fixtures__'
import type {
  CalibrationHealthCheckComparisonsByStep,
  CalibrationHealthCheckInstrument,
} from '../../../sessions/types'
import { PipetteComparisons } from '../PipetteComparisons'

const mockSessionDetails = Fixtures.mockRobotCalibrationCheckSessionDetails

describe('PipetteComparisons', () => {
  let render

  const getFirstDataRow = wrapper =>
    wrapper
      .find('tbody')
      .find('tr')
      .at(0)

  beforeEach(() => {
    render = ({
      pipette = mockSessionDetails.activePipette,
      comparisonsByStep = mockSessionDetails.comparisonsByPipette.first,
    }: {
      pipette?: CalibrationHealthCheckInstrument,
      comparisonsByStep?: CalibrationHealthCheckComparisonsByStep,
    } = {}) => {
      return mount(
        <PipetteComparisons
          pipette={pipette}
          comparisonsByStep={comparisonsByStep}
          allSteps={Sessions.FIRST_PIPETTE_COMPARISON_STEPS}
        />
      )
    }
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('renders a row for each step name passed in', () => {
    const wrapper = render()

    expect(wrapper.find('tbody').find('tr').length).toEqual(4)
  })

  it('correctly formats comparison data', () => {
    const wrapper = render()

    expect(
      getFirstDataRow(wrapper)
        .find('td')
        .at(0)
        .text()
    ).toEqual('Slot 5 Z-axis')
    expect(
      getFirstDataRow(wrapper)
        .find('td')
        .at(1)
        .find('StepStatus')
        .text()
    ).toEqual('pass')
    expect(
      getFirstDataRow(wrapper)
        .find('td')
        .at(2)
        .find('ThresholdValue')
        .exists()
    ).toBe(true)
    expect(
      getFirstDataRow(wrapper)
        .find('td')
        .at(3)
        .find('DifferenceValue')
        .exists()
    ).toBe(true)
  })

  it('correctly formats incomplete comparison data', () => {
    const wrapper = render({ comparisonsByStep: {} })

    expect(
      getFirstDataRow(wrapper)
        .find('td')
        .at(0)
        .text()
    ).toEqual('Slot 5 Z-axis')
    expect(
      getFirstDataRow(wrapper)
        .find('td')
        .at(1)
        .find('StepStatus')
        .text()
    ).toEqual('incomplete')
    expect(
      getFirstDataRow(wrapper)
        .find('td')
        .at(2)
        .text()
    ).toEqual('N/A')
    expect(
      getFirstDataRow(wrapper)
        .find('td')
        .at(3)
        .text()
    ).toEqual('N/A')
  })
})
