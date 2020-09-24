// @flow

import React from 'react'
import { shallow } from 'enzyme'
import FormTooltipText from '../../../../localization/en/tooltip'
import ApplicationText from '../../../../localization/en/application'

import { DelayFields } from '../DelayFields'
import { CheckboxRowField, TextField, TipPositionField } from '../../fields'

describe('DelayFields', () => {
  const render = props => shallow(<DelayFields {...props} />)
  describe('Aspirate Delay', () => {
    let props
    beforeEach(() => {
      props = {
        checkboxFieldName: 'aspirate_delay_checkbox',
        secondsFieldName: 'aspirate_delay_seconds',
        focusHandlers: {
          focusedField: '',
          dirtyFields: [],
          onFieldFocus: jest.fn(),
          onFieldBlur: jest.fn(),
        },
      }
    })

    it('should render an aspirate delay field with a tip position field', () => {
      props = { ...props, tipPositionFieldName: 'aspirate_mmFromBottom' }

      const wrapper = render(props)
      const checkboxField = wrapper.find(CheckboxRowField)
      expect(checkboxField.prop('name')).toBe(props.checkboxFieldName)
      expect(checkboxField.prop('label')).toBe('delay')
      expect(checkboxField.prop('tooltipComponent')).toBe(
        FormTooltipText.step_fields.defaults.aspirate_delay_checkbox
      )
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
      expect(checkboxField.prop('tooltipComponent')).toBe(
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
        focusHandlers: {
          focusedField: '',
          dirtyFields: [],
          onFieldFocus: jest.fn(),
          onFieldBlur: jest.fn(),
        },
      }
    })

    it('should render an dispense delay field with a tip position field', () => {
      props = { ...props, tipPositionFieldName: 'dispense_delay_mmFromBottom' }

      const wrapper = render(props)

      const checkboxField = wrapper.find(CheckboxRowField)
      expect(checkboxField.prop('name')).toBe(props.checkboxFieldName)
      expect(checkboxField.prop('label')).toBe('delay')
      expect(checkboxField.prop('tooltipComponent')).toBe(
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
      expect(checkboxField.prop('tooltipComponent')).toBe(
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
