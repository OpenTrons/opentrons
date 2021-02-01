// @flow
import React from 'react'
import { Provider } from 'react-redux'
import { mount } from 'enzyme'
import FormTooltipText from '../../../../localization/en/tooltip'
import ApplicationText from '../../../../localization/en/application'
import * as stepFormSelectors from '../../../../step-forms/selectors'
import { CheckboxRowField, TextField, TipPositionField } from '../../fields'
import { DelayFields, type DelayFieldProps } from '../DelayFields'
import type { BaseState } from '../../../../types'
import type { FormData } from '../../../../form-types'

jest.mock('../../../../step-forms/selectors')

const getUnsavedFormMock: JestMockFn<[BaseState], ?FormData> =
  stepFormSelectors.getUnsavedForm

const mockStore = {
  dispatch: jest.fn(),
  subscribe: jest.fn(),
  getState: () => ({}),
}

describe('DelayFields', () => {
  const render = (_props: DelayFieldProps) =>
    mount(<DelayFields {..._props} />, {
      wrappingComponent: Provider,
      wrappingComponentProps: { store: mockStore },
    })

  describe('Aspirate Delay', () => {
    let props: DelayFieldProps
    beforeEach(() => {
      props = {
        checkboxFieldName: 'aspirate_delay_checkbox',
        secondsFieldName: 'aspirate_delay_seconds',
        propsForFields: {
          aspirate_delay_checkbox: {
            onFieldFocus: (jest.fn(): any),
            onFieldBlur: (jest.fn(): any),
            errorToShow: null,
            disabled: false,
            name: 'aspirate_delay_checkbox',
            updateValue: (jest.fn(): any),
            value: true,
          },
          preWetTip: {
            onFieldFocus: (jest.fn(): any),
            onFieldBlur: (jest.fn(): any),
            errorToShow: null,
            disabled: false,
            name: 'preWetTip',
            updateValue: (jest.fn(): any),
            value: true,
          },
        },
      }

      getUnsavedFormMock.mockReturnValue({
        id: 'stepId',
        stepType: 'delay',
        aspirate_delay_checkbox: 'blah',
        aspirate_delay_seconds: 'blah',
      })
    })

    it.only('should render an aspirate delay field with a tip position field', () => {
      props = {
        ...props,
        tipPositionFieldName: 'aspirate_mmFromBottom',
      }

      const wrapper = render(props)
      const checkboxField = wrapper.find(CheckboxRowField)
      expect(checkboxField.prop('name')).toBe(props.checkboxFieldName)
      expect(checkboxField.prop('label')).toBe('delay')
      expect(checkboxField.prop('tooltipContent')).toBe(
        FormTooltipText.step_fields.defaults.aspirate_delay_checkbox
      )
      // TODO IMMEDIATELY name is not being passed down into checkbox's textfield children!
      console.log('DEBUG, ' + props.secondsFieldName)
      console.log(checkboxField.debug())
      const secondsField = checkboxField.childAt(0)
      expect(secondsField.is(TextField)).toBe(true)
      expect(secondsField.prop('name')).toBe(props.secondsFieldName)
      expect(secondsField.prop('units')).toBe(ApplicationText.units.seconds)

      const tipPosField = checkboxField.childAt(1)
      expect(tipPosField.is(TipPositionField)).toBe(true)
      expect(tipPosField.prop('fieldName')).toBe(props.tipPositionFieldName)
    })
    it('should render an aspirate delay field WITHOUT a tip position field', () => {
      const wrapper = render(props)

      const checkboxField = wrapper.find(CheckboxRowField)
      expect(checkboxField.prop('name')).toBe(props.checkboxFieldName)
      expect(checkboxField.prop('label')).toBe('delay')
      expect(checkboxField.prop('tooltipContent')).toBe(
        FormTooltipText.step_fields.defaults.aspirate_delay_checkbox
      )
      const secondsField = checkboxField.childAt(0)
      expect(secondsField.is(TextField)).toBe(true)
      expect(secondsField.prop('name')).toBe(props.secondsFieldName)
      expect(secondsField.prop('units')).toBe(ApplicationText.units.seconds)

      expect(wrapper.find(TipPositionField).length).toBe(0)
    })
  })

  describe('Dispense Delay', () => {
    let props
    beforeEach(() => {
      props = {
        checkboxFieldName: 'dispense_delay_checkbox',
        secondsFieldName: 'dispense_delay_seconds',
        propsForFields: {
          onFieldFocus: (jest.fn(): any),
          onFieldBlur: (jest.fn(): any),
        },
      }

      getUnsavedFormMock.mockReturnValue({
        id: 'stepId',
        stepType: 'delay',
        dispense_delay_checkbox: 'blah',
        dispense_delay_seconds: 'blah',
      })
    })

    it('should render an dispense delay field with a tip position field', () => {
      props = { ...props, tipPositionFieldName: 'dispense_delay_mmFromBottom' }

      const wrapper = render(props)

      const checkboxField = wrapper.find(CheckboxRowField)
      expect(checkboxField.prop('name')).toBe(props.checkboxFieldName)
      expect(checkboxField.prop('label')).toBe('delay')
      expect(checkboxField.prop('tooltipContent')).toBe(
        FormTooltipText.step_fields.defaults.dispense_delay_checkbox
      )
      const secondsField = checkboxField.childAt(0)
      expect(secondsField.is(TextField)).toBe(true)
      expect(secondsField.prop('name')).toBe(props.secondsFieldName)
      expect(secondsField.prop('units')).toBe(ApplicationText.units.seconds)

      const tipPosField = checkboxField.childAt(1)
      expect(tipPosField.is(TipPositionField)).toBe(true)
      expect(tipPosField.prop('fieldName')).toBe(props.tipPositionFieldName)
    })

    it('should render an dispense delay field WITHOUT a tip position field', () => {
      const wrapper = render(props)

      const checkboxField = wrapper.find(CheckboxRowField)
      expect(checkboxField.prop('name')).toBe(props.checkboxFieldName)
      expect(checkboxField.prop('label')).toBe('delay')
      expect(checkboxField.prop('tooltipContent')).toBe(
        FormTooltipText.step_fields.defaults.dispense_delay_checkbox
      )
      const secondsField = checkboxField.childAt(0)
      expect(secondsField.is(TextField)).toBe(true)
      expect(secondsField.prop('name')).toBe(props.secondsFieldName)
      expect(secondsField.prop('units')).toBe(ApplicationText.units.seconds)

      expect(wrapper.find(TipPositionField).length).toBe(0)
    })
  })
})
