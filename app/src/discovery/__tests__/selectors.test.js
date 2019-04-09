// discovery selectors tests
import * as discovery from '..'

const makeFullyUp = (
  name,
  ip,
  status = null,
  connected = null,
  displayName = null,
  restartStatus = null
) => ({
  name,
  ip,
  local: false,
  ok: true,
  serverOk: true,
  advertising: true,
  health: {},
  serverHealth: {},
  status,
  connected,
  displayName,
  restartStatus,
})

const makeConnectable = (
  name,
  ip,
  status = null,
  connected = null,
  displayName = null,
  restartStatus = null
) => ({
  name,
  ip,
  local: false,
  ok: true,
  serverOk: false,
  health: {},
  status,
  connected,
  displayName,
  restartStatus,
})

const makeAdvertising = (
  name,
  ip,
  status = null,
  displayName = null,
  restartStatus = null
) => ({
  name,
  ip,
  local: false,
  ok: false,
  serverOk: false,
  advertising: true,
  status,
  displayName,
  restartStatus,
})

const makeServerUp = (
  name,
  ip,
  advertising,
  status = null,
  displayName = null,
  restartStatus = null
) => ({
  name,
  ip,
  advertising,
  local: false,
  ok: false,
  serverOk: true,
  serverHealth: {},
  status,
  displayName,
  restartStatus,
})

const makeUnreachable = (
  name,
  ip,
  status = null,
  displayName = null,
  restartStatus = null
) => ({
  name,
  ip,
  local: false,
  ok: false,
  serverOk: false,
  advertising: false,
  status,
  displayName,
  restartStatus,
})

describe('discovery selectors', () => {
  const SPECS = [
    {
      name: 'getScanning when true',
      selector: discovery.getScanning,
      state: { discovery: { scanning: true } },
      expected: true,
    },
    {
      name: 'getScanning when false',
      selector: discovery.getScanning,
      state: { discovery: { scanning: false } },
      expected: false,
    },
    {
      name: 'getConnectableRobots grabs robots with ok: true and health',
      selector: discovery.getConnectableRobots,
      state: {
        discovery: {
          robotsByName: {
            foo: [makeConnectable('foo', '10.0.0.1')],
            bar: [makeFullyUp('bar', '10.0.0.2')],
          },
        },
        robot: { connection: { connectedTo: 'bar' } },
      },
      expected: [
        makeConnectable('foo', '10.0.0.1', 'connectable', false, 'foo'),
        makeFullyUp('bar', '10.0.0.2', 'connectable', true, 'bar'),
      ],
    },
    {
      name: 'getConnectableRobots grabs correct service',
      selector: discovery.getConnectableRobots,
      state: {
        discovery: {
          robotsByName: {
            foo: [
              makeConnectable('foo', '10.0.0.1'),
              makeConnectable('foo', '10.0.0.2'),
              makeServerUp('foo', '10.0.0.3', false),
              makeAdvertising('foo', '10.0.0.4', false),
            ],
          },
        },
        robot: { connection: { connectedTo: 'foo' } },
      },
      expected: [
        makeConnectable('foo', '10.0.0.1', 'connectable', true, 'foo'),
      ],
    },
    {
      name: 'getConnectableRobots adds restartStatus if it exists',
      state: {
        discovery: {
          robotsByName: { foo: [makeFullyUp('foo', '10.0.0.2')] },
          restartsByName: { foo: 'pending' },
        },
        robot: { connection: { connectedTo: 'foo' } },
      },
      selector: discovery.getConnectableRobots,
      expected: [
        makeFullyUp('foo', '10.0.0.2', 'connectable', true, 'foo', 'pending'),
      ],
    },
    {
      name: 'getReachableRobots grabs robots with serverUp or advertising',
      selector: discovery.getReachableRobots,
      state: {
        discovery: {
          robotsByName: {
            foo: [makeServerUp('foo', '10.0.0.1', false)],
            bar: [makeAdvertising('bar', '10.0.0.2')],
          },
        },
      },
      expected: [
        makeServerUp('foo', '10.0.0.1', false, 'reachable', 'foo'),
        makeAdvertising('bar', '10.0.0.2', 'reachable', 'bar'),
      ],
    },
    {
      name: 'getReachableRobots grabs correct service',
      selector: discovery.getReachableRobots,
      state: {
        discovery: {
          robotsByName: {
            foo: [
              makeServerUp('foo', '10.0.0.1', true),
              makeServerUp('foo', '10.0.0.1', false),
              makeAdvertising('foo', '10.0.0.2'),
            ],
          },
        },
      },
      expected: [makeServerUp('foo', '10.0.0.1', true, 'reachable', 'foo')],
    },
    {
      name: 'getReachableRobots does not grab connectable robots',
      selector: discovery.getReachableRobots,
      state: {
        discovery: {
          robotsByName: {
            foo: [
              makeConnectable('foo', '10.0.0.1'),
              makeServerUp('foo', '10.0.0.2', true),
            ],
            bar: [
              makeConnectable('bar', '10.0.0.3'),
              makeServerUp('bar', '10.0.0.4', false),
            ],
            baz: [
              makeConnectable('baz', '10.0.0.5'),
              makeAdvertising('baz', '10.0.0.6'),
            ],
            qux: [makeFullyUp('qux', '10.0.0.7')],
          },
        },
      },
      expected: [],
    },
    {
      name: 'getReachableRobots adds restartStatus if it exists',
      state: {
        discovery: {
          robotsByName: { foo: [makeServerUp('foo', '10.0.0.1', false)] },
          restartsByName: { foo: 'down' },
        },
      },
      selector: discovery.getReachableRobots,
      expected: [
        makeServerUp('foo', '10.0.0.1', false, 'reachable', 'foo', 'down'),
      ],
    },
    {
      name: 'getUnreachableRobots grabs robots with no ip',
      selector: discovery.getUnreachableRobots,
      state: {
        discovery: {
          robotsByName: { foo: [{ name: 'foo', ip: null }] },
        },
      },
      expected: [
        {
          name: 'foo',
          ip: null,
          status: 'unreachable',
          displayName: 'foo',
          restartStatus: null,
        },
      ],
    },
    {
      name: 'getUnreachableRobots grabs robots with IP but no responses',
      selector: discovery.getUnreachableRobots,
      state: {
        discovery: {
          robotsByName: {
            foo: [
              makeUnreachable('foo', '10.0.0.1'),
              makeUnreachable('foo', '10.0.0.2'),
            ],
          },
        },
      },
      expected: [makeUnreachable('foo', '10.0.0.1', 'unreachable', 'foo')],
    },
    {
      name: "getUnreachableRobots won't grab connectable/reachable robots",
      selector: discovery.getUnreachableRobots,
      state: {
        discovery: {
          robotsByName: {
            foo: [
              makeServerUp('foo', '10.0.0.1', true),
              makeUnreachable('foo', '10.0.0.2'),
            ],
            bar: [
              makeServerUp('bar', '10.0.0.3', false),
              makeUnreachable('bar', '10.0.0.4'),
            ],
            baz: [
              makeAdvertising('bar', '10.0.0.5'),
              makeUnreachable('baz', '10.0.0.6'),
            ],
            qux: [makeConnectable('qux', '10.0.0.7')],
          },
        },
      },
      expected: [],
    },
    {
      name: 'getUnreachableRobots adds restartStatus if it exists',
      state: {
        discovery: {
          robotsByName: { foo: [makeUnreachable('foo', '10.0.0.1')] },
          restartsByName: { foo: 'down' },
        },
      },
      selector: discovery.getUnreachableRobots,
      expected: [
        makeUnreachable('foo', '10.0.0.1', 'unreachable', 'foo', 'down'),
      ],
    },
    {
      name: 'display name removes opentrons- from connectable robot names',
      selector: discovery.getConnectableRobots,
      state: {
        discovery: {
          robotsByName: {
            'opentrons-foo': [makeConnectable('opentrons-foo', '10.0.0.1')],
            'opentrons-bar': [makeFullyUp('opentrons-bar', '10.0.0.2')],
          },
        },
        robot: { connection: { connectedTo: 'opentrons-bar' } },
      },
      expected: [
        makeConnectable(
          'opentrons-foo',
          '10.0.0.1',
          'connectable',
          false,
          'foo'
        ),
        makeFullyUp('opentrons-bar', '10.0.0.2', 'connectable', true, 'bar'),
      ],
    },
    {
      name: 'display name removes opentrons- from reachable robot names',
      selector: discovery.getReachableRobots,
      state: {
        discovery: {
          robotsByName: {
            'opentrons-foo': [makeServerUp('opentrons-foo', '10.0.0.1', false)],
            'opentrons-bar': [makeAdvertising('opentrons-bar', '10.0.0.2')],
          },
        },
      },
      expected: [
        makeServerUp('opentrons-foo', '10.0.0.1', false, 'reachable', 'foo'),
        makeAdvertising('opentrons-bar', '10.0.0.2', 'reachable', 'bar'),
      ],
    },
    {
      name: 'display name removes opentrons- from unreachable robot names',
      selector: discovery.getUnreachableRobots,
      state: {
        discovery: {
          robotsByName: {
            'opentrons-foo': [makeUnreachable('opentrons-foo', null)],
          },
        },
      },
      expected: [makeUnreachable('opentrons-foo', null, 'unreachable', 'foo')],
    },
    {
      name: 'getAllRobots returns all robots',
      selector: discovery.getAllRobots,
      state: {
        robot: { connection: { connectedTo: 'qux' } },
        discovery: {
          robotsByName: {
            foo: [
              makeConnectable('foo', '10.0.0.1'),
              makeUnreachable('foo', '10.0.0.2'),
            ],
            bar: [
              makeServerUp('bar', '10.0.0.3', false),
              makeUnreachable('bar', '10.0.0.4'),
            ],
            baz: [
              makeAdvertising('baz', '10.0.0.5'),
              makeUnreachable('baz', '10.0.0.6'),
            ],
            qux: [makeFullyUp('qux', '10.0.0.7')],
          },
        },
      },
      expected: [
        makeConnectable('foo', '10.0.0.1', 'connectable', false, 'foo'),
        makeFullyUp('qux', '10.0.0.7', 'connectable', true, 'qux'),
        makeServerUp('bar', '10.0.0.3', false, 'reachable', 'bar'),
        makeAdvertising('baz', '10.0.0.5', 'reachable', 'baz'),
      ],
    },
    {
      name: 'getConnectedRobot returns connected robot',
      selector: discovery.getConnectedRobot,
      state: {
        discovery: {
          robotsByName: {
            foo: [makeConnectable('foo', '10.0.0.1')],
            bar: [makeFullyUp('bar', '10.0.0.2')],
          },
        },
        robot: { connection: { connectedTo: 'bar' } },
      },
      expected: makeFullyUp('bar', '10.0.0.2', 'connectable', true, 'bar'),
    },
    {
      name: 'getRobotApiVersion returns serverHealth.apiServerVersion',
      // TODO(mc, 2018-10-11): state is a misnomer here, maybe rename it "input"
      state: {
        serverHealth: { apiServerVersion: '1.2.3' },
        health: { api_version: '4.5.6' },
      },
      selector: discovery.getRobotApiVersion,
      expected: '1.2.3',
    },
    {
      name: 'getRobotApiVersion returns health.api_version if no serverHealth',
      // TODO(mc, 2018-10-11): state is a misnomer here, maybe rename it "input"
      state: { serverHealth: null, health: { api_version: '4.5.6' } },
      selector: discovery.getRobotApiVersion,
      expected: '4.5.6',
    },
    {
      name: 'getRobotApiVersion returns null if no healths',
      // TODO(mc, 2018-10-11): state is a misnomer here, maybe rename it "input"
      state: { serverHealth: null, health: null },
      selector: discovery.getRobotApiVersion,
      expected: null,
    },
    {
      name: 'getRobotApiVersion returns API health if serverHealth invalid',
      // TODO(mc, 2018-10-11): state is a misnomer here, maybe rename it "input"
      state: {
        serverHealth: { apiServerVersion: 'not available' },
        health: { api_version: '4.5.6' },
      },
      selector: discovery.getRobotApiVersion,
      expected: '4.5.6',
    },
    {
      name: 'getRobotApiVersion returns null if all healths invalid',
      // TODO(mc, 2018-10-11): state is a misnomer here, maybe rename it "input"
      state: {
        serverHealth: { apiServerVersion: 'not available' },
        health: { api_version: 'also not available' },
      },
      selector: discovery.getRobotApiVersion,
      expected: null,
    },
    {
      name: 'getRobotFirmwareVersion returns serverHealth.smoothieVersion',
      // TODO(mc, 2018-10-11): state is a misnomer here, maybe rename it "input"
      state: {
        serverHealth: { smoothieVersion: '1.2.3' },
        health: { fw_version: '4.5.6' },
      },
      selector: discovery.getRobotFirmwareVersion,
      expected: '1.2.3',
    },
    {
      name:
        'getRobotFirmwareVersion returns health.fw_version if no serverHealth',
      // TODO(mc, 2018-10-11): state is a misnomer here, maybe rename it "input"
      state: { serverHealth: null, health: { fw_version: '4.5.6' } },
      selector: discovery.getRobotFirmwareVersion,
      expected: '4.5.6',
    },
    {
      name: 'getRobotFirmwareVersion returns null if no healths',
      // TODO(mc, 2018-10-11): state is a misnomer here, maybe rename it "input"
      state: { serverHealth: null, health: null },
      selector: discovery.getRobotFirmwareVersion,
      expected: null,
    },
  ]

  SPECS.forEach(spec => {
    const { name, selector, state, expected } = spec
    test(name, () => expect(selector(state)).toEqual(expected))
  })
})
