// @flow
import configureMockStore from 'redux-mock-store'
import thunk from 'redux-thunk'
import { when, resetAllWhenMocks } from 'jest-when'
import { deleteMultipleSteps } from '../actions/actions'
import { getOrderedStepIds } from '../../step-forms/selectors'

jest.mock('../../step-forms/selectors')

const getOrderedStepIdsMock = getOrderedStepIds

const mockStore = configureMockStore([thunk])
describe('step list actions', () => {
  describe('deleteMultipleSteps', () => {
    let store
    beforeEach(() => {
      store = mockStore()
      when(getOrderedStepIdsMock)
        .calledWith(expect.anything())
        .mockReturnValue([])
    })

    afterEach(() => {
      resetAllWhenMocks()
      jest.resetAllMocks()
    })
    describe('when not deleting all steps', () => {
      it('should select the remaining steps', () => {
        const allSteps = ['1', '2', '3', '4', '5']
        const stepsToDelete = ['1', '2']

        when(getOrderedStepIdsMock)
          .calledWith(expect.anything())
          .mockReturnValue(allSteps)

        store.dispatch(deleteMultipleSteps(stepsToDelete))
        const deleteMultipleStepsAction = {
          type: 'DELETE_MULTIPLE_STEPS',
          payload: ['1', '2'],
        }

        const selectMultipleStepsAction = {
          type: 'SELECT_MULTIPLE_STEPS',
          payload: { stepIds: ['3'], lastSelected: '3' },
        }
        const actions = store.getActions()
        expect(actions).toEqual([
          deleteMultipleStepsAction,
          selectMultipleStepsAction,
        ])
      })
      it('should select the remaining steps even when given in a nonlinear order', () => {
        const allSteps = ['1', '2', '3', '4', '5']
        const stepsToDelete = ['4', '1']

        when(getOrderedStepIdsMock)
          .calledWith(expect.anything())
          .mockReturnValue(allSteps)

        store.dispatch(deleteMultipleSteps(stepsToDelete))
        const deleteMultipleStepsAction = {
          type: 'DELETE_MULTIPLE_STEPS',
          payload: ['4', '1'],
        }

        const selectMultipleStepsAction = {
          type: 'SELECT_MULTIPLE_STEPS',
          payload: { stepIds: ['5'], lastSelected: '5' },
        }
        const actions = store.getActions()
        expect(actions).toEqual([
          deleteMultipleStepsAction,
          selectMultipleStepsAction,
        ])
      })
      it('should select the last non terminal item that is not deleted', () => {
        const allSteps = ['1', '2', '3', '4', '5']
        const stepsToDelete = ['4', '5']

        when(getOrderedStepIdsMock)
          .calledWith(expect.anything())
          .mockReturnValue(allSteps)

        store.dispatch(deleteMultipleSteps(stepsToDelete))
        const deleteMultipleStepsAction = {
          type: 'DELETE_MULTIPLE_STEPS',
          payload: ['4', '5'],
        }

        const selectMultipleStepsAction = {
          type: 'SELECT_MULTIPLE_STEPS',
          payload: { stepIds: ['3'], lastSelected: '3' },
        }
        const actions = store.getActions()
        expect(actions).toEqual([
          deleteMultipleStepsAction,
          selectMultipleStepsAction,
        ])
      })
      it('should select the last non terminal item that is not deleted even when given a non linear order', () => {
        const allSteps = ['1', '2', '3', '4', '5']
        const stepsToDelete = ['5', '4', '1']

        when(getOrderedStepIdsMock)
          .calledWith(expect.anything())
          .mockReturnValue(allSteps)

        store.dispatch(deleteMultipleSteps(stepsToDelete))
        const deleteMultipleStepsAction = {
          type: 'DELETE_MULTIPLE_STEPS',
          payload: ['5', '4', '1'],
        }

        const selectMultipleStepsAction = {
          type: 'SELECT_MULTIPLE_STEPS',
          payload: { stepIds: ['3'], lastSelected: '3' },
        }
        const actions = store.getActions()
        expect(actions).toEqual([
          deleteMultipleStepsAction,
          selectMultipleStepsAction,
        ])
      })
    })
    describe('when deleting all steps', () => {
      it('should delete all of the steps and clear the selected item', () => {
        const allSteps = ['1', '2', '3', '4', '5']
        const stepsToDelete = [...allSteps]

        when(getOrderedStepIdsMock)
          .calledWith(expect.anything())
          .mockReturnValue(allSteps)

        store.dispatch(deleteMultipleSteps(stepsToDelete))
        const deleteMultipleStepsAction = {
          type: 'DELETE_MULTIPLE_STEPS',
          payload: allSteps,
        }

        const clearSelectedItemAction = {
          type: 'CLEAR_SELECTED_ITEM',
        }
        const actions = store.getActions()
        expect(actions).toEqual([
          deleteMultipleStepsAction,
          clearSelectedItemAction,
        ])
      })
    })
  })
})
