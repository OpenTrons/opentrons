import * as React from 'react'
import { Provider } from 'react-redux'
import { createStore } from 'redux'
import { renderHook } from '@testing-library/react-hooks'
import { i18n } from '../../../i18n'
import { I18nextProvider } from 'react-i18next'
import { getAllDefs } from '../helpers/getAllDefs'

import {
  getCustomLabware,
  getAddLabwareFailure,
  getAddNewLabwareName,
} from '../../../redux/custom-labware'
import {
  mockDefinition,
  mockValidLabware,
} from '../../../redux/custom-labware/__fixtures__'

import {
  useGetAllLabware,
  useLabwareFailure,
  useNewLabwareName,
} from '../hooks'

import type { Store } from 'redux'
import type { State } from '../../../redux/types'
import { FailedLabwareFile } from '../../../redux/custom-labware/types'

jest.mock('../../../redux/custom-labware')
jest.mock('../helpers/getAllDefs')

const mockGetCustomLabware = getCustomLabware as jest.MockedFunction<
  typeof getCustomLabware
>
const mockGetAllAllDefs = getAllDefs as jest.MockedFunction<typeof getAllDefs>
const mockGetAddLabwareFailure = getAddLabwareFailure as jest.MockedFunction<
  typeof getAddLabwareFailure
>
const mockGetAddNewLabwareName = getAddNewLabwareName as jest.MockedFunction<
  typeof getAddNewLabwareName
>

describe('useGetAllLabware hook', () => {
  const store: Store<State> = createStore(jest.fn(), {})
  beforeEach(() => {
    mockGetAllAllDefs.mockReturnValue([mockDefinition])
    mockGetCustomLabware.mockReturnValue([mockValidLabware])
    store.dispatch = jest.fn()
  })
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should return object with only definition and modified date', () => {
    const wrapper: React.FunctionComponent<{}> = ({ children }) => (
      <Provider store={store}>{children}</Provider>
    )
    const { result } = renderHook(useGetAllLabware, { wrapper })
    const labware1 = result.current[0]
    const labware2 = result.current[1]

    expect(labware1.definition).toBe(mockDefinition)
    expect(labware2.modified).toBe(mockValidLabware.modified)
    expect(labware2.definition).toBe(mockValidLabware.definition)
  })
})

describe('useLabwareFailure hook', () => {
  const store: Store<State> = createStore(jest.fn(), {})
  beforeEach(() => {
    mockGetAddLabwareFailure.mockReturnValue({
      file: {
        type: 'INVALID_LABWARE_FILE',
        filename: '123',
      } as FailedLabwareFile,
      errorMessage: null,
    })
    store.dispatch = jest.fn()
  })
  afterEach(() => {
    jest.restoreAllMocks()
  })
  it('should return invalid labware definition', () => {
    const wrapper: React.FunctionComponent<{}> = ({ children }) => (
      <Provider store={store}>
        <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
      </Provider>
    )
    const { result } = renderHook(useLabwareFailure, { wrapper })
    const errorMessage = result.current.labwareFailureMessage
    expect(errorMessage).toBe('Error importing 123. Invalid labware definition')
  })
  it('should return duplicate labware definition', () => {
    mockGetAddLabwareFailure.mockReturnValue({
      file: {
        type: 'DUPLICATE_LABWARE_FILE',
        filename: '123',
      } as FailedLabwareFile,
      errorMessage: null,
    })

    const wrapper: React.FunctionComponent<{}> = ({ children }) => (
      <Provider store={store}>
        <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
      </Provider>
    )
    const { result } = renderHook(useLabwareFailure, { wrapper })
    const errorMessage = result.current.labwareFailureMessage

    expect(errorMessage).toBe(
      'Error importing 123. Duplicate labware definition'
    )
  })
  it('should return opentrons labware definition', () => {
    mockGetAddLabwareFailure.mockReturnValue({
      file: {
        type: 'OPENTRONS_LABWARE_FILE',
        filename: '123',
      } as FailedLabwareFile,
      errorMessage: null,
    })

    const wrapper: React.FunctionComponent<{}> = ({ children }) => (
      <Provider store={store}>
        <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
      </Provider>
    )
    const { result } = renderHook(useLabwareFailure, { wrapper })
    const errorMessage = result.current.labwareFailureMessage

    expect(errorMessage).toBe(
      'Error importing 123. Opentrons labware definition'
    )
  })
  it('should return unable to upload labware definition', () => {
    mockGetAddLabwareFailure.mockReturnValue({
      file: null,
      errorMessage: 'error',
    })

    const wrapper: React.FunctionComponent<{}> = ({ children }) => (
      <Provider store={store}>
        <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
      </Provider>
    )
    const { result } = renderHook(useLabwareFailure, { wrapper })
    const errorMessage = result.current.labwareFailureMessage

    expect(errorMessage).toBe('Unable to upload file')
  })
})

describe('useNewLabwareName hook', () => {
  const store: Store<State> = createStore(jest.fn(), {})
  beforeEach(() => {
    mockGetAddNewLabwareName.mockReturnValue({ filename: 'mock_filename' })
    store.dispatch = jest.fn()
  })
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should return filename as a string', () => {
    const wrapper: React.FunctionComponent<{}> = ({ children }) => (
      <Provider store={store}>{children}</Provider>
    )
    const { result } = renderHook(useNewLabwareName, { wrapper })
    const filename = result.current.newLabwareName
    expect(filename).toBe('mock_filename')
  })
})
