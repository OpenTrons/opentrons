// @flow
import React from 'react'
import { Provider } from 'react-redux'
import { mount } from 'enzyme'
import * as Formik from 'formik'
import { PDAlert } from '../../../alerts/PDAlert'
import { EditModulesModalNew } from '../EditModulesModalNew'
import {
  MAGNETIC_MODULE_TYPE,
  type LabwareDefinition2,
  type ModuleRealType,
} from '@opentrons/shared-data'
import {
  selectors as stepFormSelectors,
  type InitialDeckSetup,
} from '../../../../step-forms'
import { selectors as featureSelectors } from '../../../../feature-flags'
import fixture_96_plate from '@opentrons/shared-data/labware/fixtures/2/fixture_96_plate'
import { getLabwareIsCompatible } from '../../../../utils/labwareModuleCompatibility'
import type { BaseState } from '../../../../types'
import { SlotDropdown } from '../SlotDropdown'
import { isModuleWithCollisionIssue } from '../../../modules/utils'
import {
  getLabwareOnSlot,
  getSlotsBlockedBySpanning,
  getSlotIsEmpty,
} from '../../../../step-forms/utils'
import {
  MODELS_FOR_MODULE_TYPE,
  TEMPERATURE_DEACTIVATED,
} from '../../../../constants'
import { ModelDropdown } from '../ModelDropdown'
import {
  TEMPERATURE_MODULE_TYPE,
  MAGNETIC_MODULE_V1,
  MAGNETIC_MODULE_V2,
  TEMPERATURE_MODULE_V1,
  TEMPERATURE_MODULE_V2,
} from '../../../../../../shared-data/js/constants'
import * as moduleData from '../../../../modules/moduleData'
import { OutlineButton } from '../../../../../../components/src/buttons/OutlineButton'
import { act } from 'react-dom/test-utils'

jest.mock('../../../../utils/labwareModuleCompatibility')
jest.mock('../../../../feature-flags')
jest.mock('../../../../step-forms/selectors')
jest.mock('../../../modules/utils')
jest.mock('../../../../step-forms/utils')
jest.mock('../form-state')

const MODEL_FIELD = 'selectedModel'
const SLOT_FIELD = 'selectedSlot'

const getInitialDeckSetupMock: JestMockFn<[BaseState], InitialDeckSetup> =
  stepFormSelectors.getInitialDeckSetup

const getLabwareIsCompatibleMock: JestMockFn<
  [LabwareDefinition2, ModuleRealType],
  boolean
> = getLabwareIsCompatible

const getDisableModuleRestrictionsMock: JestMockFn<[BaseState], ?boolean> =
  featureSelectors.getDisableModuleRestrictions

const isModuleWithCollisionIssueMock: JestMockFn<
  any,
  any
> = isModuleWithCollisionIssue

const getSlotsBlockedBySpanningMock: JestMockFn<
  any,
  any
> = getSlotsBlockedBySpanning

const getSlotIsEmptyMock: JestMockFn<any, any> = getSlotIsEmpty

const getLabwareOnSlotMock: JestMockFn<any, any> = getLabwareOnSlot

// const getAllModuleSlotsByTypeMock: JestMockFn<any, any> = getAllModuleSlotsByType

const mockFormikValueChange = () => {
  const values = {
    [MODEL_FIELD]: 'some_model',
    [SLOT_FIELD]: '8',
  }
  jest.spyOn(Formik, 'useFormikContext').mockImplementation(() => ({ values }))
}
const mockInitialDeckSetup = () => {
  getInitialDeckSetupMock.mockReturnValue({
    labware: {
      well96Id: {
        ...fixture_96_plate,
        slot: '1',
      },
    },
    modules: {
      mag_mod: {
        id: 'mag_mod',
        moduleState: {
          type: MAGNETIC_MODULE_TYPE,
          engaged: false,
        },
        type: MAGNETIC_MODULE_TYPE,
        slot: '7',
        model: MAGNETIC_MODULE_V1,
      },
      temp_mod: {
        id: 'temp_mod',
        moduleState: {
          type: TEMPERATURE_MODULE_TYPE,
          status: TEMPERATURE_DEACTIVATED,
          targetTemperature: null,
        },
        type: TEMPERATURE_MODULE_TYPE,
        slot: '8',
        model: TEMPERATURE_MODULE_V1,
      },
    },
    pipettes: {},
  })
}

describe('Edit Modules Modal', () => {
  let mockStore
  let props
  beforeEach(() => {
    mockInitialDeckSetup()
    mockFormikValueChange()
    getSlotsBlockedBySpanningMock.mockReturnValue([])
    getLabwareOnSlotMock.mockReturnValueOnce({})

    props = {
      moduleId: 'mag_mod',
      moduleType: MAGNETIC_MODULE_TYPE,
      onCloseClick: jest.fn(),
      editModuleModel: jest.fn(),
      editModuleSlot: jest.fn(),
      setChangeModuleWarningInfo: jest.fn(),
    }
    mockStore = {
      dispatch: jest.fn(),
      subscribe: jest.fn(),
      getState: () => ({}),
    }
  })

  afterEach(() => {
    jest.clearAllMocks()
  })
  const render = props =>
    mount(
      <Provider store={mockStore}>
        <EditModulesModalNew {...props} />
      </Provider>
    )

  describe('PD alert', () => {
    beforeEach(() => {
      getDisableModuleRestrictionsMock.mockReturnValue(false)
    })
    afterEach(() => {
      jest.clearAllMocks()
    })
    it('does NOT render when labware is compatible', () => {
      getLabwareIsCompatibleMock.mockReturnValue(true)
      const wrapper = render(props)
      expect(wrapper.find(PDAlert)).toHaveLength(0)
    })

    it('renders when labware is incompatible', () => {
      getLabwareIsCompatibleMock.mockReturnValue(false)
      const wrapper = render(props)
      expect(wrapper.find(PDAlert)).toHaveLength(1)
    })
  })

  describe('Slot Dropdown', () => {
    afterEach(() => {
      isModuleWithCollisionIssueMock.mockReset()
    })

    it('should pass the correct options', () => {
      const mockSlots = [{ value: 'mockSlots', name: 'mockSlots' }]
      jest
        .spyOn(moduleData, 'getAllModuleSlotsByType')
        .mockImplementation(() => mockSlots)

      const wrapper = render(props)
      expect(wrapper.find(SlotDropdown).prop('options')).toBe(mockSlots)
    })
    it('should be enabled when there is no collision issue', () => {
      isModuleWithCollisionIssueMock.mockReturnValueOnce(false)
      const wrapper = render(props)
      expect(wrapper.find(SlotDropdown).prop('disabled')).toBe(false)
    })

    it('should be disabled when there is no collision issue', () => {
      isModuleWithCollisionIssueMock.mockReturnValue(true)
      const wrapper = render(props)
      expect(wrapper.find(SlotDropdown).prop('disabled')).toBe(true)
    })

    it('should error when labware is incompatible', () => {
      getLabwareIsCompatibleMock.mockReturnValue(false)
      const wrapper = render(props)
      expect(wrapper.find(SlotDropdown).prop('error')).toMatch(
        'labware incompatible'
      )
    })

    it('should error when slot is empty but blocked', () => {
      getSlotIsEmptyMock.mockReturnValueOnce(true)
      getSlotsBlockedBySpanningMock.mockReturnValue(['8'])
      const wrapper = render(props)
      expect(wrapper.find(SlotDropdown).prop('error')).toMatch(
        'labware incompatible'
      )
    })
    it('should NOT error when labware is compatible', () => {
      getLabwareIsCompatibleMock.mockReturnValue(true)
      const wrapper = render(props)
      expect(wrapper.find(SlotDropdown).prop('error')).toBe(null)
    })
  })

  describe('Model Dropdown', () => {
    it('should pass the correct props for magnetic module', () => {
      props.moduleType = MAGNETIC_MODULE_TYPE
      const wrapper = render(props)
      const expectedProps = {
        fieldName: MODEL_FIELD,
        options: MODELS_FOR_MODULE_TYPE[MAGNETIC_MODULE_TYPE],
      }
      expect(wrapper.find(ModelDropdown).props()).toEqual(expectedProps)
    })
    it('should pass the correct props for temperature module', () => {
      props.moduleType = TEMPERATURE_MODULE_TYPE
      const wrapper = render(props)
      const expectedProps = {
        fieldName: MODEL_FIELD,
        options: MODELS_FOR_MODULE_TYPE[TEMPERATURE_MODULE_TYPE],
      }
      expect(wrapper.find(ModelDropdown).props()).toEqual(expectedProps)
    })
  })

  describe('Cancel Button', () => {
    it('calls onCloseClick when pressed', () => {
      const wrapper = render(props)
      wrapper
        .find(OutlineButton)
        .at(0)
        .prop('onClick')()
      expect(props.onCloseClick).toHaveBeenCalled()
    })
  })
  describe('Form Submission', () => {
    it('sets module change warning info when model has changed and is magnetic module', () => {
      const wrapper = render(props)
      const formik = wrapper.find(Formik.Formik)
      const mockValues = {
        selectedSlot: '1',
        selectedModel: MAGNETIC_MODULE_V2,
      }
      act(() => {
        formik.invoke('onSubmit')(mockValues)
      })
      expect(props.setChangeModuleWarningInfo).toHaveBeenCalledWith({
        model: mockValues.selectedModel,
        slot: mockValues.selectedSlot,
      })
    })

    it('edits the model  and changes slot when model changes but is not magnetic module ', () => {
      props.moduleId = 'temp_mod'
      const wrapper = render(props)
      const formik = wrapper.find(Formik.Formik)
      const mockValues = {
        selectedSlot: '1',
        selectedModel: TEMPERATURE_MODULE_V2,
      }
      act(() => {
        formik.invoke('onSubmit')(mockValues)
      })
      expect(props.editModuleModel).toHaveBeenCalledWith(TEMPERATURE_MODULE_V2)
      expect(props.editModuleSlot).toHaveBeenCalledWith('1')
    })
  })
})
