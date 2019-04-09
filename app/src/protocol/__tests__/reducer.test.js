// protocol state reducer tests

import { protocolReducer } from '..'

describe('protocolReducer', () => {
  test('initial state', () => {
    expect(protocolReducer(undefined, {})).toEqual({
      file: null,
      contents: null,
      data: null,
    })
  })

  const SPECS = [
    {
      name: 'handles protocol:OPEN',
      action: {
        type: 'protocol:OPEN',
        payload: { file: { name: 'proto.py' } },
      },
      initialState: { file: {}, contents: 'foobar', data: {} },
      expectedState: { file: { name: 'proto.py' }, contents: null, data: null },
    },
    {
      name: 'handles protocol:UPLOAD',
      action: {
        type: 'protocol:UPLOAD',
        payload: { contents: 'foo', data: {} },
      },
      initialState: { file: { name: 'proto.py' }, contents: null, data: null },
      expectedState: { file: { name: 'proto.py' }, contents: 'foo', data: {} },
    },
    {
      name: 'handles robot:SESSION_RESPONSE with non-JSON protocol',
      action: {
        type: 'robot:SESSION_RESPONSE',
        payload: { name: 'foo', protocolText: 'bar' },
      },
      initialState: { file: null, contents: null, data: null },
      expectedState: {
        file: { name: 'foo', type: null, lastModified: null },
        contents: 'bar',
        data: null,
      },
    },
    {
      name: 'handles robot:SESSION_RESPONSE with JSON protocol',
      action: {
        type: 'robot:SESSION_RESPONSE',
        payload: { name: 'foo.json', protocolText: '{"metadata": {}}' },
      },
      initialState: { file: null, contents: null, data: null },
      expectedState: {
        file: {
          name: 'foo.json',
          type: 'application/json',
          lastModified: null,
        },
        contents: '{"metadata": {}}',
        data: { metadata: {} },
      },
    },
    {
      name: 'handles robot:SESSION_RESPONSE with Python protocol metadata',
      action: {
        type: 'robot:SESSION_RESPONSE',
        payload: {
          name: 'foo.py',
          protocolText: '# foo.py',
          metadata: { 'protocol-name': 'foo' },
        },
      },
      initialState: { file: null, contents: null, data: null },
      expectedState: {
        file: {
          name: 'foo.py',
          type: 'text/x-python-script',
          lastModified: null,
        },
        contents: '# foo.py',
        data: { metadata: { 'protocol-name': 'foo' } },
      },
    },
    {
      name: 'handles robot:DISCONNECT by clearing state',
      action: { type: 'robot:DISCONNECT_RESPONSE' },
      initialState: { file: { name: 'proto.py' }, contents: 'foo', data: {} },
      expectedState: { file: null, contents: null, data: null },
    },
  ]

  SPECS.forEach(spec => {
    const { name, action, initialState, expectedState } = spec

    test(name, () => {
      expect(protocolReducer(initialState, action)).toEqual(expectedState)
    })
  })
})
