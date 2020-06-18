// @flow
import * as React from 'react'
import { Provider } from 'react-redux'
import { mount } from 'enzyme'

import { DeckCalibrationWarning } from '../DeckCalibrationWarning'
import { Icon, Flex, ALIGN_CENTER, Box } from '@opentrons/components'

describe('Calibration Warning Component', () => {
  let mockStore
  let render

  beforeEach(() => {
    mockStore = {
      subscribe: () => {},
      getState: () => ({
        mockState: true,
      }),
      dispatch: jest.fn(),
    }

    render = (status: string = 'OK') => {
      return mount(<DeckCalibrationWarning calibrationStatus={status} />, {
        wrappingComponent: Provider,
        wrappingComponentProps: { store: mockStore },
      })
    }
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('Check nothing renders when calibration is OK', () => {
    const wrapper = render()
    expect(wrapper).toEqual({})
  })

  it('Check warning generates specific components', () => {
    const wrapper = render('IDENTITY')
    const flex = wrapper.find(Flex)
    const icon = wrapper.find(Icon)
    const box = wrapper.find(Box)
    const fullText = box.text()
    const toSplit = fullText.split('.')

    expect(flex.prop('alignItems')).toBe(ALIGN_CENTER)
    expect(icon.prop('name')).toEqual('alert-circle')
    expect(toSplit[1]).toEqual(expect.stringContaining('Please perform a deck'))
  })

  it('Check calibration is identity', () => {
    const wrapper = render('IDENTITY')
    const icon = wrapper.find(Icon)
    const box = wrapper.find(Box)
    const fullText = box.text()
    const toSplit = fullText.split('.')

    expect(icon.prop('className')).toEqual('cal_check_warning_icon')
    expect(toSplit[0]).toEqual(
      expect.stringContaining('not yet been calibrated')
    )
  })

  it('Check calibration is singular or bad', () => {
    const wrapper = render('SINGULARITY')

    const icon = wrapper.find(Icon)
    const box = wrapper.find(Box)
    const fullText = box.text()
    const toSplit = fullText.split('.')

    expect(icon.prop('className')).toEqual('cal_check_error_icon')
    expect(toSplit[0]).toEqual(
      expect.stringContaining('Bad deck calibration detected')
    )
  })
})
