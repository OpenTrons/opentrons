import * as serviceList from '../service-list'
import MOCK_SERVICE from '../__fixtures__/service'

describe('serviceList', () => {
  describe('createServiceList', () => {
    const SPECS = [
      {
        name: 'returns empty array by default',
        input: [],
        expected: [],
      },
      {
        name: 'cleans up input list',
        input: [
          {...MOCK_SERVICE, name: 'foo', ok: true, serverOk: false},
          {...MOCK_SERVICE, name: 'bar', ok: false, serverOk: true},
          {...MOCK_SERVICE, name: 'baz', ok: true, serverOk: true},
        ],
        expected: [
          {...MOCK_SERVICE, name: 'foo'},
          {...MOCK_SERVICE, name: 'bar', ip: null},
          {...MOCK_SERVICE, name: 'baz', ip: null},
        ],
      },
      {
        name: 'removes unknown IP entries if known IP entry exists',
        input: [MOCK_SERVICE, {...MOCK_SERVICE, ip: null}],
        expected: [MOCK_SERVICE],
      },
      {
        name: 'collapses multiple IP unknown duplicates into one',
        input: [
          {...MOCK_SERVICE, ip: null},
          MOCK_SERVICE,
          {...MOCK_SERVICE, name: 'bar', ip: null},
          {...MOCK_SERVICE, name: 'bar', ip: null},
        ],
        expected: [MOCK_SERVICE, {...MOCK_SERVICE, name: 'bar', ip: null}],
      },
    ]

    SPECS.forEach(spec => {
      const {name, input, expected} = spec
      const result = serviceList.createServiceList.call(null, input)
      test(name, () => expect(result).toEqual(expected))
    })
  })

  describe('upsertServiceList', () => {
    const SPECS = [
      {
        name: 'adds service if new',
        list: [],
        upsert: MOCK_SERVICE,
        expected: [MOCK_SERVICE],
      },
      {
        name: 'does not add existing service',
        list: [MOCK_SERVICE],
        upsert: MOCK_SERVICE,
        expected: [MOCK_SERVICE],
      },
      {
        name: 'updates existing service',
        list: [MOCK_SERVICE],
        upsert: {...MOCK_SERVICE, ok: true, serverOk: false},
        expected: [{...MOCK_SERVICE, ok: true, serverOk: false}],
      },
      {
        name: 'does not null out ok flags of existing service',
        list: [{...MOCK_SERVICE, ok: true, serverOk: false}],
        upsert: MOCK_SERVICE,
        expected: [{...MOCK_SERVICE, ok: true, serverOk: false}],
      },
      {
        name: 'nulls out IP duplicates',
        list: [
          {...MOCK_SERVICE, name: 'bar', ok: false, serverOk: true},
          {...MOCK_SERVICE, name: 'baz', ok: false, serverOk: true},
        ],
        upsert: MOCK_SERVICE,
        expected: [
          MOCK_SERVICE,
          {...MOCK_SERVICE, name: 'bar', ip: null, ok: null, serverOk: null},
          {...MOCK_SERVICE, name: 'baz', ip: null, ok: null, serverOk: null},
        ],
      },
    ]

    SPECS.forEach(spec => {
      const {name, list, upsert, expected} = spec
      const result = serviceList.upsertServiceList.call(null, list, upsert)
      test(name, () => expect(result).toEqual(expected))
    })
  })
})
