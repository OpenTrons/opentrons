// @flow
import {_allReducers} from '../reducers.js'

const {collapsedSteps, selectedItem, stepCreationButtonExpanded} = _allReducers

describe('collapsedSteps reducer', () => {
  test('add step', () => {
    const state = {}
    const action = {
      type: 'ADD_STEP',
      payload: {id: '1', stepType: 'transfer'},
    }
    expect(collapsedSteps(state, action)).toEqual({
      '1': false, // default is false: not collapsed
    })
  })

  test('toggle step on->off', () => {
    const state = {
      '1': true,
      '2': false,
      '3': true,
      '4': true,
    }
    const action = {
      type: 'TOGGLE_STEP_COLLAPSED',
      payload: '3',
    }
    expect(collapsedSteps(state, action)).toEqual({
      '1': true,
      '2': false,
      '3': false,
      '4': true,
    })
  })

  test('toggle step off-> on', () => {
    const state = {
      '1': true,
      '2': false,
      '3': true,
      '4': true,
    }
    const action = {
      type: 'TOGGLE_STEP_COLLAPSED',
      payload: '2',
    }
    expect(collapsedSteps(state, action)).toEqual({
      '1': true,
      '2': true,
      '3': true,
      '4': true,
    })
  })
})

describe('selectedItem reducer', () => {
  test('select step', () => {
    const stepId = '123'
    const action = {
      type: 'SELECT_STEP',
      payload: stepId,
    }
    expect(selectedItem(null, action)).toEqual({
      isStep: true,
      id: stepId,
    })
  })

  test('select terminal item', () => {
    const terminalId = 'test'
    const action = {
      type: 'SELECT_TERMINAL_ITEM',
      payload: terminalId,
    }
    expect(selectedItem(null, action)).toEqual({
      isStep: false,
      id: terminalId,
    })
  })
})

describe('stepCreationButtonExpanded reducer', () => {
  test('close (or stay closed) on newly added step', () => {
    const action = {
      type: 'ADD_STEP',
      payload: {id: '123', stepType: 'transfer'},
    }
    expect(stepCreationButtonExpanded(true, action)).toEqual(false)
    expect(stepCreationButtonExpanded(false, action)).toEqual(false)
  })

  test('update with EXPAND_ADD_STEP_BUTTON action payload', () => {
    expect(stepCreationButtonExpanded(false, {
      type: 'EXPAND_ADD_STEP_BUTTON',
      payload: true,
    })).toEqual(true)

    expect(stepCreationButtonExpanded(true, {
      type: 'EXPAND_ADD_STEP_BUTTON',
      payload: false,
    })).toEqual(false)
  })
})
