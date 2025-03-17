import { describe, it, expect, vi, afterEach } from 'vitest'
import configureMockStore from 'redux-mock-store'
import thunk from 'redux-thunk'
import {
  fixture_96_plate,
  fixture_tiprack_10_ul,
} from '@opentrons/shared-data/labware/fixtures/2'
import { getLabwareDefsByURI } from '../../labware-defs/selectors'
import { getInitialDeckSetup } from '../../step-forms/selectors'
import { getLabwareNicknamesById } from '../../ui/labware/selectors'
import { uuid } from '../../utils'
import { getRobotType } from '../../file-data/selectors'
import { renameLabware, createContainer } from '../actions'
import { getNextAvailableDeckSlot, getNextNickname } from '../utils'
import type { LabwareDefinition2 } from '@opentrons/shared-data'

vi.mock('../../labware-defs/selectors')
vi.mock('../../step-forms/selectors')
vi.mock('../../ui/labware/selectors')
vi.mock('../../file-data/selectors')
vi.mock('../../utils')
vi.mock('../utils')

const middlewares = [thunk]
const mockStore = configureMockStore(middlewares)

afterEach(() => {
  vi.resetAllMocks()
})

describe('renameLabware thunk', () => {
  it('should dispatch RENAME_LABWARE with a nickname from getNextNickname if `name` arg is unspecified', () => {
    const store: any = mockStore({})

    vi.mocked(getLabwareNicknamesById).mockImplementation(state => {
      expect(state).toBe(store.getState())
      return { someLabwareId: 'Some Labware', otherLabwareId: 'Other Labware' }
    })

    vi.mocked(getNextNickname).mockImplementation(
      (allNicknames, proposedNickname) => {
        expect(allNicknames).not.toContain('Some Labware')
        expect(allNicknames).toContain('Other Labware')
        expect(proposedNickname).toEqual('Some Labware')
        return 'Mock Next Nickname'
      }
    )

    const expectedActions = [
      {
        type: 'RENAME_LABWARE',
        payload: { labwareId: 'someLabwareId', name: 'Mock Next Nickname' },
      },
    ]
    store.dispatch(renameLabware({ labwareId: 'someLabwareId' }))
    expect(store.getActions()).toEqual(expectedActions)
  })

  it('should dispatch RENAME_LABWARE with a nickname from getNextNickname, with the nickname specified in the `name` arg', () => {
    const store: any = mockStore({})

    vi.mocked(getLabwareNicknamesById).mockImplementation(state => {
      expect(state).toBe(store.getState())
      return { someLabwareId: 'Some Labware', otherLabwareId: 'Other Labware' }
    })

    vi.mocked(getNextNickname).mockImplementation(
      (allNicknames, proposedNickname) => {
        expect(allNicknames).not.toContain('Some Labware')
        expect(allNicknames).toContain('Other Labware')

        expect(proposedNickname).toEqual('Specified Name')
        // In real life, 'Mock Next Nickname' might be "Some Labware (2)" -- but that
        // is up to the implementation of getNextNickname.
        return 'Mock Next Nickname'
      }
    )

    const expectedActions = [
      {
        type: 'RENAME_LABWARE',
        payload: { labwareId: 'someLabwareId', name: 'Mock Next Nickname' },
      },
    ]

    store.dispatch(
      renameLabware({ labwareId: 'someLabwareId', name: 'Specified Name' })
    )
    expect(store.getActions()).toEqual(expectedActions)
  })
})

describe('createContainer', () => {
  it('should dispatch CREATE_CONTAINER with the specified slot', () => {
    const store: any = mockStore({})
    vi.mocked(getRobotType).mockReturnValue('OT-2 Standard')
    vi.mocked(getInitialDeckSetup).mockImplementation(state => {
      expect(state).toBe(store.getState())
      return {
        labware: {},
        pipettes: {},
        modules: {},
        additionalEquipmentOnDeck: {},
      }
    })

    vi.mocked(getLabwareDefsByURI).mockImplementation(state => {
      expect(state).toBe(store.getState())
      return { someLabwareDefURI: fixture_96_plate as LabwareDefinition2 }
    })

    vi.mocked(uuid).mockImplementation(() => 'fakeUuid')

    const expectedActions = [
      {
        type: 'CREATE_CONTAINER',
        payload: {
          id: 'fakeUuid:someLabwareDefURI',
          labwareDefURI: 'someLabwareDefURI',
          slot: '4',
          displayCategory: 'wellPlate',
        },
      },
    ]

    store.dispatch(
      createContainer({ labwareDefURI: 'someLabwareDefURI', slot: '4' })
    )
    expect(store.getActions()).toEqual(expectedActions)
  })

  it('should dispatch CREATE_CONTAINER with slot from getNextAvailableDeckSlot if no slot is specified', () => {
    const store: any = mockStore({})
    vi.mocked(getRobotType).mockReturnValue('OT-2 Standard')
    const initialDeckSetup = {
      labware: {},
      pipettes: {},
      modules: {},
      additionalEquipmentOnDeck: {},
    }
    vi.mocked(getInitialDeckSetup).mockImplementation(state => {
      expect(state).toBe(store.getState())
      return initialDeckSetup
    })

    vi.mocked(getLabwareDefsByURI).mockImplementation(state => {
      expect(state).toBe(store.getState())
      return { someLabwareDefURI: fixture_96_plate as LabwareDefinition2 }
    })

    vi.mocked(uuid).mockImplementation(() => 'fakeUuid')

    vi.mocked(getNextAvailableDeckSlot).mockImplementation(
      _initialDeckSetup => {
        expect(_initialDeckSetup).toBe(initialDeckSetup)
        return '3'
      }
    )

    const expectedActions = [
      {
        type: 'CREATE_CONTAINER',
        payload: {
          id: 'fakeUuid:someLabwareDefURI',
          labwareDefURI: 'someLabwareDefURI',
          slot: '3',
          displayCategory: 'wellPlate',
        },
      },
    ]

    store.dispatch(createContainer({ labwareDefURI: 'someLabwareDefURI' }))
    expect(store.getActions()).toEqual(expectedActions)
  })

  it('should do nothing if no slot is specified and getNextAvailableDeckSlot returns falsey', () => {
    const store: any = mockStore({})
    vi.mocked(getRobotType).mockReturnValue('OT-3 Standard')
    const initialDeckSetup = {
      labware: {},
      pipettes: {},
      modules: {},
      additionalEquipmentOnDeck: {},
    }
    vi.mocked(getInitialDeckSetup).mockImplementation(state => {
      expect(state).toBe(store.getState())
      return initialDeckSetup
    })

    vi.mocked(getLabwareDefsByURI).mockImplementation(state => {
      expect(state).toBe(store.getState())
      return { someLabwareDefURI: fixture_96_plate as LabwareDefinition2 }
    })

    vi.mocked(getNextAvailableDeckSlot).mockImplementation(
      _initialDeckSetup => {
        expect(_initialDeckSetup).toBe(initialDeckSetup)
        // IRL this would mean that the deck is full, no slots available
        return null
      }
    )

    const expectedActions: any[] = []

    store.dispatch(createContainer({ labwareDefURI: 'someLabwareDefURI' }))
    expect(store.getActions()).toEqual(expectedActions)
  })

  it('should dispatch CREATE_CONTAINER and then RENAME_LABWARE if the labware is a tiprack', () => {
    // NOTE: this is because we don't show the NameThisLabwareOverlay for tipracks,
    // so for the auto-incrementing My Tiprack (1), My Tiprack (2) mechanism to work
    // we must dispatch RENAME_LABWARE here instead of having that overlay dispatch it.
    const store: any = mockStore({})
    vi.mocked(getRobotType).mockReturnValue('OT-2 Standard')
    vi.mocked(getLabwareNicknamesById).mockImplementation(state => {
      expect(state).toBe(store.getState())
      return {
        'fakeUuid:someLabwareDefURI': 'Some Labware',
        otherLabwareId: 'Other Labware',
      }
    })

    vi.mocked(getNextNickname).mockImplementation(
      (allNicknames, proposedNickname) => {
        expect(allNicknames).not.toContain('Some Labware')
        expect(allNicknames).toContain('Other Labware')

        expect(proposedNickname).toEqual('Some Labware')
        // In real life, 'Mock Next Nickname' might be "Some Labware (2)" -- but that
        // is up to the implementation of getNextNickname.
        return 'Mock Next Nickname'
      }
    )

    vi.mocked(getInitialDeckSetup).mockImplementation(state => {
      expect(state).toBe(store.getState())
      return {
        labware: {},
        pipettes: {},
        modules: {},
        additionalEquipmentOnDeck: {},
      }
    })

    vi.mocked(getLabwareDefsByURI).mockImplementation(state => {
      expect(state).toBe(store.getState())
      return { someLabwareDefURI: fixture_tiprack_10_ul as LabwareDefinition2 }
    })

    vi.mocked(uuid).mockImplementation(() => 'fakeUuid')

    const expectedActions = [
      {
        type: 'CREATE_CONTAINER',
        payload: {
          id: 'fakeUuid:someLabwareDefURI',
          labwareDefURI: 'someLabwareDefURI',
          slot: '4',
          displayCategory: 'tipRack',
        },
      },
      {
        type: 'RENAME_LABWARE',
        payload: {
          labwareId: 'fakeUuid:someLabwareDefURI',
          name: 'Mock Next Nickname',
        },
      },
    ]

    store.dispatch(
      createContainer({ labwareDefURI: 'someLabwareDefURI', slot: '4' })
    )
    expect(store.getActions()).toEqual(expectedActions)
  })
})
