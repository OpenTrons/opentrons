import * as Fixtures from '../__fixtures__'
import * as selectors from '../selectors'

import type { State } from '../../types'
import type { ValidLabwareFile } from '../types'

interface SelectorSpec {
  name: string
  selector: (state: State) => unknown
  state: State
  expected: unknown
}

describe('custom labware selectors', () => {
  const SPECS: SelectorSpec[] = [
    {
      name: 'getCustomLabware',
      selector: selectors.getCustomLabware,
      state: {
        labware: {
          addFailureFile: null,
          addFailureMessage: null,
          listFailureMessage: null,
          filenames: [
            Fixtures.mockValidLabware.filename,
            Fixtures.mockInvalidLabware.filename,
          ],
          filesByName: {
            [Fixtures.mockValidLabware.filename]: Fixtures.mockValidLabware,
            [Fixtures.mockInvalidLabware.filename]: Fixtures.mockInvalidLabware,
          },
        },
      } as State,
      expected: [Fixtures.mockValidLabware, Fixtures.mockInvalidLabware],
    },
    {
      name: 'getCustomLabware sorts by displayCategory then displayName',
      selector: selectors.getCustomLabware,
      state: {
        labware: {
          addFailureFile: null,
          addFailureMessage: null,
          listFailureMessage: null,
          filenames: ['4.json', '2.json', '1.json', '3.json'],
          filesByName: {
            '4.json': {},
            '2.json': {
              definition: {
                metadata: { displayCategory: 'A', displayName: 'B' },
              },
            },
            '1.json': {
              definition: {
                metadata: { displayCategory: 'A', displayName: 'A' },
              },
            },
            '3.json': {
              definition: {
                metadata: { displayCategory: 'B', displayName: 'A' },
              },
            },
          },
        },
      } as any,
      expected: [
        {
          definition: { metadata: { displayCategory: 'A', displayName: 'A' } },
        },
        {
          definition: { metadata: { displayCategory: 'A', displayName: 'B' } },
        },
        {
          definition: { metadata: { displayCategory: 'B', displayName: 'A' } },
        },
        {},
      ],
    },

    {
      name: 'getValidCustomLabware',
      selector: selectors.getValidCustomLabware,
      state: {
        labware: {
          addFailureFile: null,
          addFailureMessage: null,
          listFailureMessage: null,
          filenames: [
            Fixtures.mockValidLabware.filename,
            Fixtures.mockInvalidLabware.filename,
            'foo.json',
          ],
          filesByName: {
            [Fixtures.mockValidLabware.filename]: Fixtures.mockValidLabware,
            [Fixtures.mockInvalidLabware.filename]: Fixtures.mockInvalidLabware,
            'foo.json': {
              ...Fixtures.mockValidLabware,
              filename: 'foo.json',
            } as ValidLabwareFile,
          },
        },
      } as any,
      expected: [
        Fixtures.mockValidLabware,
        { ...Fixtures.mockValidLabware, filename: 'foo.json' },
      ],
    },
    {
      name: 'getAddLabwareFailure',
      selector: selectors.getAddLabwareFailure,
      state: {
        labware: {
          addFailureFile: Fixtures.mockInvalidLabware,
          addFailureMessage: 'AH',
          listFailureMessage: null,
          filenames: [],
          filesByName: {},
        },
      } as any,
      expected: { file: Fixtures.mockInvalidLabware, errorMessage: 'AH' },
    },
    {
      name: 'getListLabwareErrorMessage',
      selector: selectors.getListLabwareErrorMessage,
      state: {
        labware: {
          addFailureFile: null,
          addFailureMessage: null,
          listFailureMessage: 'AH',
          filenames: [],
          filesByName: {},
        },
      } as any,
      expected: 'AH',
    },
    {
      name: 'getCustomLabwareDirectory',
      selector: selectors.getCustomLabwareDirectory,
      state: {
        config: {
          labware: {
            directory: '/path/to/labware',
          },
        },
      } as any,
      expected: '/path/to/labware',
    },
  ]

  SPECS.forEach(spec => {
    const { name, selector, state, expected } = spec
    it(name, () => expect(selector(state)).toEqual(expected))
  })
})
