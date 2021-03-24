// @flow
import fixture_96_plate from '@opentrons/shared-data/labware/fixtures/2/fixture_96_plate.json'
import React from 'react'
import { Provider } from 'react-redux'
import { mount } from 'enzyme'
import ApplicationText from '../../../../localization/en/application'
import * as stepFormSelectors from '../../../../step-forms/selectors'
import { CheckboxRowField, TextField, TipPositionField } from '../../fields'
import { DelayFields, type DelayFieldProps } from '../DelayFields'
import type { BaseState } from '../../../../types'
import type { FormData } from '../../../../form-types'

jest.mock('../../../../step-forms/selectors')

const getUnsavedFormMock: JestMockFn<[BaseState], ?FormData> =
  stepFormSelectors.getUnsavedForm

const getLabwareEntitiesMock: JestMockFn<[BaseState], any> =
  stepFormSelectors.getLabwareEntities

const mockStore = {
  dispatch: jest.fn(),
  subscribe: jest.fn(),
  getState: () => ({}),
}

beforeEach(() => {
  getUnsavedFormMock.mockReturnValue({
    id: 'stepId',
    stepType: 'moveLiquid',
  })

  getLabwareEntitiesMock.mockReturnValue({
    labware123asp: {
      id: 'labware123asp',
      labwareDefURI: fixture_96_plate.labwareDefURI,
      def: fixture_96_plate,
    },
    labware123disp: {
      id: 'labware123disp',
      labwareDefURI: fixture_96_plate.labwareDefURI,
      def: fixture_96_plate,
    },
    labware123: {
      id: 'labware123',
      labwareDefURI: fixture_96_plate.labwareDefURI,
      def: fixture_96_plate,
    },
  })
})

afterEach(() => {
  jest.resetAllMocks()
})

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
        labwareId: 'labware123asp',
        propsForFields: {
          aspirate_delay_checkbox: {
            onFieldFocus: (jest.fn(): any),
            onFieldBlur: (jest.fn(): any),
            errorToShow: null,
            disabled: false,
            name: 'aspirate_delay_checkbox',
            updateValue: (jest.fn(): any),
            value: true,
            tooltipContent: 'tooltip for aspirate_delay_checkbox',
          },
          aspirate_delay_seconds: {
            onFieldFocus: (jest.fn(): any),
            onFieldBlur: (jest.fn(): any),
            errorToShow: null,
            disabled: false,
            name: 'aspirate_delay_seconds',
            updateValue: (jest.fn(): any),
            value: '1',
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
          aspirate_mmFromBottom: {
            onFieldFocus: (jest.fn(): any),
            onFieldBlur: (jest.fn(): any),
            errorToShow: null,
            disabled: false,
            name: 'aspirate_mmFromBottom',
            updateValue: (jest.fn(): any),
            value: true,
          },
          aspirate_delay_mmFromBottom: {
            onFieldFocus: (jest.fn(): any),
            onFieldBlur: (jest.fn(): any),
            errorToShow: null,
            disabled: false,
            name: 'aspirate_delay_mmFromBottom',
            updateValue: (jest.fn(): any),
            value: true,
          },
        },
      }
    })

    it('should render an aspirate delay field with a tip position field', () => {
      props = {
        ...props,
        tipPositionFieldName: 'aspirate_mmFromBottom',
      }

      const wrapper = render(props)
      const checkboxField = wrapper.find(CheckboxRowField)
      expect(checkboxField.prop('name')).toBe(props.checkboxFieldName)
      expect(checkboxField.prop('label')).toBe('delay')
      expect(checkboxField.prop('tooltipContent')).toBe(
        `tooltip for ${props.checkboxFieldName}`
      )

      const secondsField = wrapper.find(TextField)
      expect(secondsField.is(TextField)).toBe(true)
      expect(secondsField.prop('name')).toBe(props.secondsFieldName)
      expect(secondsField.prop('units')).toBe(ApplicationText.units.seconds)

      const tipPosField = wrapper.find(TipPositionField)
      expect(tipPosField.is(TipPositionField)).toBe(true)
      expect(tipPosField.prop('name')).toBe(props.tipPositionFieldName)
    })

    it('should render an aspirate delay field WITHOUT a tip position field', () => {
      const wrapper = render(props)

      const checkboxField = wrapper.find(CheckboxRowField)
      expect(checkboxField.prop('name')).toBe(props.checkboxFieldName)
      expect(checkboxField.prop('label')).toBe('delay')
      expect(checkboxField.prop('tooltipContent')).toBe(
        `tooltip for ${props.checkboxFieldName}`
      )
      const secondsField = wrapper.find(TextField)
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
        labwareId: 'labware123disp',
        propsForFields: {
          dispense_delay_checkbox: {
            onFieldFocus: (jest.fn(): any),
            onFieldBlur: (jest.fn(): any),
            errorToShow: null,
            disabled: false,
            name: 'dispense_delay_checkbox',
            updateValue: (jest.fn(): any),
            value: true,
            tooltipContent: 'tooltip for dispense_delay_checkbox',
          },
          dispense_delay_seconds: {
            onFieldFocus: (jest.fn(): any),
            onFieldBlur: (jest.fn(): any),
            errorToShow: null,
            disabled: false,
            name: 'dispense_delay_seconds',
            updateValue: (jest.fn(): any),
            value: '1',
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
          dispense_mmFromBottom: {
            onFieldFocus: (jest.fn(): any),
            onFieldBlur: (jest.fn(): any),
            errorToShow: null,
            disabled: false,
            name: 'dispense_mmFromBottom',
            updateValue: (jest.fn(): any),
            value: true,
          },
          dispense_delay_mmFromBottom: {
            onFieldFocus: (jest.fn(): any),
            onFieldBlur: (jest.fn(): any),
            errorToShow: null,
            disabled: false,
            name: 'dispense_delay_mmFromBottom',
            updateValue: (jest.fn(): any),
            value: true,
          },
        },
      }
    })

    it('should render a dispense delay field with a tip position field', () => {
      props = { ...props, tipPositionFieldName: 'dispense_delay_mmFromBottom' }
      const wrapper = render(props)

      const checkboxField = wrapper.find(CheckboxRowField)
      expect(checkboxField.prop('name')).toBe(props.checkboxFieldName)
      expect(checkboxField.prop('label')).toBe('delay')
      expect(checkboxField.prop('tooltipContent')).toBe(
        `tooltip for ${props.checkboxFieldName}`
      )
      const secondsField = wrapper.find(TextField)
      expect(secondsField.is(TextField)).toBe(true)
      expect(secondsField.prop('name')).toBe(props.secondsFieldName)
      expect(secondsField.prop('units')).toBe(ApplicationText.units.seconds)

      const tipPosField = wrapper.find(TipPositionField)
      expect(tipPosField.is(TipPositionField)).toBe(true)
      expect(tipPosField.prop('name')).toBe(props.tipPositionFieldName)
    })

    it('should render an dispense delay field WITHOUT a tip position field', () => {
      const wrapper = render(props)

      const checkboxField = wrapper.find(CheckboxRowField)
      expect(checkboxField.prop('name')).toBe(props.checkboxFieldName)
      expect(checkboxField.prop('label')).toBe('delay')
      expect(checkboxField.prop('tooltipContent')).toBe(
        `tooltip for ${props.checkboxFieldName}`
      )
      const secondsField = wrapper.find(TextField)
      expect(secondsField.is(TextField)).toBe(true)
      expect(secondsField.prop('name')).toBe(props.secondsFieldName)
      expect(secondsField.prop('units')).toBe(ApplicationText.units.seconds)

      expect(wrapper.find(TipPositionField).length).toBe(0)
    })
  })
})
