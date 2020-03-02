// @flow
import {
  MAGNETIC_MODULE_TYPE,
  TEMPERATURE_MODULE_TYPE,
} from '@opentrons/shared-data'
import React from 'react'
import { Provider } from 'react-redux'
import { render, mount } from 'enzyme'
import fixture_tiprack_10_ul from '@opentrons/shared-data/labware/fixtures/2/fixture_tiprack_10_ul.json'
import {
  TEMPERATURE_APPROACHING_TARGET,
  TEMPERATURE_AT_TARGET,
  TEMPERATURE_DEACTIVATED,
} from '../../../constants'
import { ModuleStatus, ModuleTag } from '../ModuleTag'

import * as timelineFramesSelectors from '../../../top-selectors/timelineFrames'
import { selectors as stepFormSelectors } from '../../../step-forms'
import * as uiSelectors from '../../../ui/steps'

import type { BaseState } from '../../../types'
import type { CommandsAndRobotState } from '../../../step-generation'
import type { ModuleEntities, InitialDeckSetup } from '../../../step-forms'

jest.mock('../../../ui/steps')
jest.mock('../../../top-selectors/timelineFrames')
jest.mock('../../../step-forms')

const timelineFrameBeforeActiveItemMock: JestMockFn<
  [BaseState],
  CommandsAndRobotState
> = timelineFramesSelectors.timelineFrameBeforeActiveItem

const getModuleEntitiesMock: JestMockFn<[BaseState], ModuleEntities> =
  stepFormSelectors.getModuleEntities

const getHoveredStepLabwareMock: JestMockFn<[BaseState], Array<string>> =
  uiSelectors.getHoveredStepLabware

const getInitialDeckSetup: JestMockFn<[BaseState], InitialDeckSetup> =
  stepFormSelectors.getInitialDeckSetup

describe('ModuleTag', () => {
  describe('ModuleStatus', () => {
    describe('magnet module', () => {
      test('displays engaged when magent is engaged', () => {
        const props = {
          engaged: true,
          type: MAGNETIC_MODULE_TYPE,
        }

        const component = render(<ModuleStatus moduleState={props} />)

        expect(component.text()).toBe('engaged')
      })

      test('displays disengaged when magnet is not engaged', () => {
        const moduleState = {
          engaged: false,
          type: MAGNETIC_MODULE_TYPE,
        }

        const component = render(<ModuleStatus moduleState={moduleState} />)

        expect(component.text()).toBe('disengaged')
      })
    })

    describe('temperature module', () => {
      test('deactivated is shown when module is deactivated', () => {
        const moduleState = {
          type: TEMPERATURE_MODULE_TYPE,
          status: TEMPERATURE_DEACTIVATED,
          targetTemperature: null,
        }

        const component = render(<ModuleStatus moduleState={moduleState} />)

        expect(component.text()).toBe('Deactivated')
      })

      test('target temperature is shown when module is at target', () => {
        const moduleState = {
          type: TEMPERATURE_MODULE_TYPE,
          status: TEMPERATURE_AT_TARGET,
          targetTemperature: 45,
        }

        const component = render(<ModuleStatus moduleState={moduleState} />)

        expect(component.text()).toBe('45 °C')
      })

      test('going to X is shown when temperature is approaching target', () => {
        const moduleState = {
          type: TEMPERATURE_MODULE_TYPE,
          status: TEMPERATURE_APPROACHING_TARGET,
          targetTemperature: 45,
        }

        const component = render(<ModuleStatus moduleState={moduleState} />)

        expect(component.text()).toBe('Going to 45 °C')
      })
    })
  })

  describe('ModuleTagComponent', () => {
    let store, props
    beforeEach(() => {
      props = {
        x: 1,
        y: 2,
        orientation: 'left',
        id: 'abcdef',
      }

      store = {
        subscribe: jest.fn(),
        dispatch: jest.fn(),
        getState: () => ({}),
      }

      timelineFrameBeforeActiveItemMock.mockReturnValue({
        commands: [],
        robotState: {
          labware: {},
          liquidState: {
            pipettes: {},
            labware: {},
          },
          pipettes: {},
          tipState: {
            tipracks: {},
            pipettes: {},
          },
          modules: {
            abcdef: {
              slot: '3',
              moduleState: {
                type: TEMPERATURE_MODULE_TYPE,
                status: TEMPERATURE_DEACTIVATED,
                targetTemperature: null,
              },
            },
          },
        },
        warnings: [],
      })

      getModuleEntitiesMock.mockReturnValue({
        abcdef: {
          id: 'abcdef',
          type: 'temperatureModuleType',
          model: 'GEN1',
        },
      })

      getHoveredStepLabwareMock.mockReturnValue(['labwareId'])
    })

    it('adds a border when the step is is a module step type', () => {
      getInitialDeckSetup.mockReturnValue({
        labware: {
          labwareId: {
            id: 'labwareId',
            slot: 'abcdef',
            labwareDefURI: 'url',
            def: fixture_tiprack_10_ul,
          },
        },
        pipettes: {},
        modules: {},
      })

      const wrapper = mount(
        <Provider store={store}>
          <ModuleTag {...props} />
        </Provider>
      )

      expect(
        wrapper.find('RobotCoordsForeignDiv').prop('innerDivProps').className
      ).toContain('highlighted_border_div')
    })

    it('does not add a border when the step is not a module step and labware is not on the module', () => {
      getInitialDeckSetup.mockReturnValue({
        labware: {
          labwareId: {
            id: 'labwareId',
            slot: '3',
            labwareDefURI: 'url',
            def: fixture_tiprack_10_ul,
          },
        },
        pipettes: {},
        modules: {},
      })

      const wrapper = mount(
        <Provider store={store}>
          <ModuleTag {...props} />
        </Provider>
      )

      expect(
        wrapper.find('RobotCoordsForeignDiv').prop('innerDivProps').className
      ).not.toContain('highlighted_border_div')
    })
  })
})
