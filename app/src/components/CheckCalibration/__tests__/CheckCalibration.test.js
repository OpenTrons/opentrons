// @flow
import * as React from 'react'
import { Provider } from 'react-redux'
import { mount } from 'enzyme'

import { getDeckDefinitions } from '@opentrons/components/src/deck/getDeckDefinitions'

import * as Calibration from '../../../calibration'
import { mockRobotCalibrationCheckSessionData } from '../../../calibration/__fixtures__'

import { CheckCalibration } from '../index'
import { Introduction } from '../Introduction'
import { DeckSetup } from '../DeckSetup'
import { TipPickUp } from '../TipPickUp'
import { CheckXYPoint } from '../CheckXYPoint'
import { CheckHeight } from '../CheckHeight'
import { CompleteConfirmation } from '../CompleteConfirmation'

import type { State } from '../../../types'

jest.mock('@opentrons/components/src/deck/getDeckDefinitions')
jest.mock('../../../calibration/selectors')

type CheckCalibrationSpec = {
  component: React.AbstractComponent<any>,
  currentStep: Calibration.RobotCalibrationCheckStep,
}
const getRobotCalibrationCheckSession: JestMockFn<
  [State, string],
  $Call<typeof Calibration.getRobotCalibrationCheckSession, State, string>
> = Calibration.getRobotCalibrationCheckSession

const mockGetDeckDefinitions: JestMockFn<
  [],
  $Call<typeof getDeckDefinitions, any>
> = getDeckDefinitions

describe('CheckCalibration', () => {
  let mockStore
  let render

  const mockCloseCalibrationCheck = jest.fn()

  const getBackButton = wrapper =>
    wrapper.find({ title: 'Back' }).find('button')

  const POSSIBLE_CHILDREN = [
    Introduction,
    DeckSetup,
    TipPickUp,
    CheckXYPoint,
    CheckHeight,
    CompleteConfirmation,
  ]

  const SPECS: Array<CheckCalibrationSpec> = [
    { component: Introduction, currentStep: 'sessionStarted' },
    { component: DeckSetup, currentStep: 'labwareLoaded' },
    { component: TipPickUp, currentStep: 'preparingFirstPipette' },
    { component: TipPickUp, currentStep: 'inspectingFirstTip' },
    { component: TipPickUp, currentStep: 'preparingSecondPipette' },
    { component: TipPickUp, currentStep: 'inspectingSecondTip' },
    { component: CheckXYPoint, currentStep: 'joggingFirstPipetteToPointOne' },
    { component: CheckXYPoint, currentStep: 'comparingFirstPipettePointOne' },
    { component: CheckXYPoint, currentStep: 'joggingFirstPipetteToPointTwo' },
    { component: CheckXYPoint, currentStep: 'comparingFirstPipettePointTwo' },
    { component: CheckXYPoint, currentStep: 'joggingFirstPipetteToPointThree' },
    { component: CheckXYPoint, currentStep: 'comparingFirstPipettePointThree' },
    { component: CheckXYPoint, currentStep: 'joggingSecondPipetteToPointOne' },
    { component: CheckXYPoint, currentStep: 'comparingSecondPipettePointOne' },
    { component: CheckHeight, currentStep: 'joggingFirstPipetteToHeight' },
    { component: CheckHeight, currentStep: 'comparingFirstPipetteHeight' },
    { component: CheckHeight, currentStep: 'joggingSecondPipetteToHeight' },
    { component: CheckHeight, currentStep: 'comparingSecondPipetteHeight' },
    { component: CompleteConfirmation, currentStep: 'checkComplete' },
  ]

  beforeEach(() => {
    mockStore = {
      subscribe: () => {},
      getState: () => ({
        mockState: true,
      }),
      dispatch: jest.fn(),
    }
    mockGetDeckDefinitions.mockReturnValue({})

    render = () => {
      return mount(
        <CheckCalibration
          robotName="robot-name"
          closeCalibrationCheck={mockCloseCalibrationCheck}
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

  it('fetches robot cal check session on mount', () => {
    getRobotCalibrationCheckSession.mockReturnValue(
      mockRobotCalibrationCheckSessionData
    )
    render()

    expect(mockStore.dispatch).toHaveBeenCalledWith(
      Calibration.fetchRobotCalibrationCheckSession('robot-name')
    )
  })

  SPECS.forEach(spec => {
    it(`renders correct contents when currentStep is ${spec.currentStep}`, () => {
      getRobotCalibrationCheckSession.mockReturnValue({
        ...mockRobotCalibrationCheckSessionData,
        currentStep: spec.currentStep,
      })
      const wrapper = render()

      POSSIBLE_CHILDREN.forEach(child => {
        if (child === spec.component) {
          expect(wrapper.exists(child)).toBe(true)
        } else {
          expect(wrapper.exists(child)).toBe(false)
        }
      })
    })
  })

  it('calls deleteRobotCalibrationCheckSession on exit click', () => {
    const wrapper = render()

    getBackButton(wrapper).invoke('onClick')()

    expect(mockStore.dispatch).toHaveBeenCalledWith(
      Calibration.deleteRobotCalibrationCheckSession('robot-name')
    )
    expect(mockCloseCalibrationCheck).toHaveBeenCalled()
  })
})
