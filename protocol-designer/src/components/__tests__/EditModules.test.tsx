import React from 'react'
import { act } from 'react-dom/test-utils'
import { mount } from 'enzyme'
import { EditModules, EditModulesProps } from '../EditModules'
import { Provider } from 'react-redux'
import {
  InitialDeckSetup,
  selectors as stepFormSelectors,
} from '../../step-forms'
import { selectors as tutorialSelectors } from '../../tutorial'
import { BlockingHint } from '../Hints/useBlockingHint'
import { EditModulesModal } from '../modals/EditModulesModal'
import { MAGNETIC_MODULE_TYPE } from '@opentrons/shared-data'

jest.mock('../../step-forms/selectors')
jest.mock('../../tutorial')
jest.mock('../modals/EditModulesModal')

const mockEditModulesModal = EditModulesModal as jest.MockedFunction<
  typeof EditModulesModal
>
const getInitialDeckSetupMock = stepFormSelectors.getInitialDeckSetup as jest.MockedFunction<
  typeof stepFormSelectors.getInitialDeckSetup
>
const getDismissedHintsMock = tutorialSelectors.getDismissedHints as jest.MockedFunction<
  typeof tutorialSelectors.getDismissedHints
>

describe('Edit Modules', () => {
  const TEST_ID = 'testId'
  let props: EditModulesProps
  let moduleToEdit
  let mockStore: any
  let onCloseClick

  beforeEach(() => {
    moduleToEdit = {
      moduleId: TEST_ID,
      moduleType: MAGNETIC_MODULE_TYPE,
    }
    onCloseClick = jest.fn()
    props = { moduleToEdit, onCloseClick }
    mockStore = {
      dispatch: jest.fn(),
      subscribe: jest.fn(),
      getState: () => ({}),
    }
    getDismissedHintsMock.mockReturnValue([])
    getInitialDeckSetupMock.mockReturnValue(({
      modules: { [TEST_ID]: {} },
    } as unknown) as InitialDeckSetup)
    mockEditModulesModal.mockReturnValue(<div>mock edit modules modal</div>)
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  const render = (props: EditModulesProps) =>
    mount(<EditModules {...props} />, {
      wrappingComponent: Provider,
      wrappingComponentProps: { store: mockStore },
    })

  it('should initially render the edit modules modal', () => {
    const wrapper = render(props)
    expect(wrapper.find(EditModulesModal)).toHaveLength(1)
  })
  it('should render the module change warning when displayModuleWarning is called from EditModulesModal', () => {
    const wrapper = render(props)
    const editModulesModal = wrapper.find(EditModulesModal)
    expect(editModulesModal).toHaveLength(1)

    act(() => {
      editModulesModal.prop('displayModuleWarning')({
        model: 'some_model' as any,
        slot: 'some_slot',
      })
    })

    wrapper.update()
    expect(wrapper.find(EditModulesModal)).toHaveLength(0)
    expect(wrapper.find(BlockingHint)).toHaveLength(1)
  })
})
