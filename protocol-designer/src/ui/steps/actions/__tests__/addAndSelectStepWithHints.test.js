// @flow
import { addAndSelectStepWithHints } from '../thunks'
import { addStep } from '../thunks/addStep'
import { addHint } from '../../../../tutorial/actions'
import * as uiModuleSelectors from '../../../../ui/modules/selectors'
import { selectors as labwareIngredSelectors } from '../../../../labware-ingred/selectors'
jest.mock('../thunks/addStep')
jest.mock('../../../../tutorial/actions')
jest.mock('../../../../ui/modules/selectors')
jest.mock('../../../../labware-ingred/selectors')

const dispatch = jest.fn()
const getState = jest.fn()
const addStepMock: JestMockFn<[{ stepType: string }, string], *> = addStep
const addHintMock: JestMockFn<[any, string], *> = addHint
const mockGetDeckHasLiquid: JestMockFn<[Object], *> =
  labwareIngredSelectors.getDeckHasLiquid
const mockGetMagnetModuleHasLabware: JestMockFn<[Object], *> =
  uiModuleSelectors.getMagnetModuleHasLabware
const mockGetTemperatureModuleHasLabware: JestMockFn<[Object], *> =
  uiModuleSelectors.getTemperatureModuleHasLabware
const mockGetThermocyclerModuleHasLabware: JestMockFn<[Object], *> =
  uiModuleSelectors.getThermocyclerModuleHasLabware
const mockGetSingleTemperatureModuleId: JestMockFn<[Object], *> =
  uiModuleSelectors.getSingleTemperatureModuleId
const mockGetSingleThermocyclerModuleId: JestMockFn<[Object], *> =
  uiModuleSelectors.getSingleThermocyclerModuleId

beforeEach(() => {
  dispatch.mockClear()
  getState.mockClear()

  addStepMock.mockClear()
  addStepMock.mockReturnValue('addStepMockReturnValue')
  addHintMock.mockClear()
  addHintMock.mockReturnValue('addHintReturnValue')

  mockGetDeckHasLiquid.mockClear()
  mockGetDeckHasLiquid.mockReturnValue(true)
  mockGetMagnetModuleHasLabware.mockClear()
  mockGetMagnetModuleHasLabware.mockReturnValue(false)
  mockGetTemperatureModuleHasLabware.mockClear()
  mockGetTemperatureModuleHasLabware.mockReturnValue(false)
  mockGetThermocyclerModuleHasLabware.mockClear()
  mockGetThermocyclerModuleHasLabware.mockReturnValue(false)
  mockGetSingleTemperatureModuleId.mockClear()
  mockGetSingleTemperatureModuleId.mockReturnValue(null)
  mockGetSingleThermocyclerModuleId.mockClear()
  mockGetSingleThermocyclerModuleId.mockReturnValue(null)
})

describe('addAndSelectStepWithHints', () => {
  test('should dispatch ADD_STEP, and no hints when no hints are applicable (eg pause step)', () => {
    const stepType = 'pause'
    const payload = { stepType }
    addAndSelectStepWithHints(payload)(dispatch, getState)

    expect(addStepMock.mock.calls).toEqual([[payload]])
    expect(dispatch.mock.calls).toEqual([['addStepMockReturnValue']])
  })

  it('should dispatch ADD_STEP, and also ADD_HINT "add_liquids_and_labware" if we\'re adding a step that uses liquid but have no liquids on the deck', () => {
    const stepType = 'moveLiquid'
    const payload = { stepType }
    mockGetDeckHasLiquid.mockReturnValue(false) // no liquid!
    addAndSelectStepWithHints(payload)(dispatch, getState)

    expect(addStepMock.mock.calls).toEqual([[payload]])
    expect(addHintMock.mock.calls).toEqual([['add_liquids_and_labware']])
    expect(dispatch.mock.calls).toEqual([
      ['addStepMockReturnValue'],
      ['addHintReturnValue'],
    ])
  })

  describe('should dispatch ADD_STEP, and also ADD_HINT "module_without_labware" for module steps if module lacks labware', () => {
    ;[
      {
        testName: 'magnet step, magnetic module has no labware',
        stepType: 'magnet',
        selectorValues: {
          getMagnetModuleHasLabware: false,
          getTemperatureModuleHasLabware: false,
          getThermocyclerModuleHasLabware: false,
          getSingleTemperatureModuleId: null,
          getSingleThermocyclerModuleId: null,
        },
      },
      {
        testName: 'temperature step, temperature module has no labware',
        stepType: 'temperature',
        selectorValues: {
          getMagnetModuleHasLabware: false,
          getTemperatureModuleHasLabware: false,
          getThermocyclerModuleHasLabware: false,
          getSingleTemperatureModuleId: 'something',
          getSingleThermocyclerModuleId: null,
        },
      },
      {
        testName: 'temperature step, thermocycler has no labware',
        stepType: 'temperature',
        selectorValues: {
          getMagnetModuleHasLabware: false,
          getTemperatureModuleHasLabware: false,
          getThermocyclerModuleHasLabware: false,
          getSingleTemperatureModuleId: null,
          getSingleThermocyclerModuleId: 'something',
        },
      },
    ].forEach(({ testName, stepType, selectorValues }) => {
      it(testName, () => {
        mockGetMagnetModuleHasLabware.mockReturnValue(
          selectorValues.getMagnetModuleHasLabware
        )
        mockGetTemperatureModuleHasLabware.mockReturnValue(
          selectorValues.getTemperatureModuleHasLabware
        )
        mockGetThermocyclerModuleHasLabware.mockReturnValue(
          selectorValues.getThermocyclerModuleHasLabware
        )
        mockGetSingleTemperatureModuleId.mockReturnValue(
          selectorValues.getSingleTemperatureModuleId
        )
        mockGetSingleThermocyclerModuleId.mockReturnValue(
          selectorValues.getSingleThermocyclerModuleId
        )
        const payload = { stepType }
        addAndSelectStepWithHints(payload)(dispatch, getState)

        expect(addStepMock.mock.calls).toEqual([[payload]])
        expect(addHintMock.mock.calls).toEqual([['module_without_labware']])
        expect(dispatch.mock.calls).toEqual([
          ['addStepMockReturnValue'],
          ['addHintReturnValue'],
        ])
      })
    })
  })
})
