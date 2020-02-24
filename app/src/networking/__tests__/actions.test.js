// @flow

import { mockRobot, mockRequestMeta } from '../../robot-api/__fixtures__'
import * as Actions from '../actions'
import * as Fixtures from '../__fixtures__'

import type { NetworkingAction } from '../types'

type ActionSpec = {|
  name: string,
  creator: (...Array<any>) => mixed,
  args: Array<mixed>,
  expected: NetworkingAction,
|}

describe('networking actions', () => {
  const SPECS: Array<ActionSpec> = [
    {
      name: 'networking:FETCH_STATUS',
      creator: Actions.fetchStatus,
      args: [mockRobot.name],
      expected: {
        type: 'networking:FETCH_STATUS',
        payload: { robotName: mockRobot.name },
        meta: {},
      },
    },
    {
      name: 'networking:FETCH_STATUS_SUCCESS',
      creator: Actions.fetchStatusSuccess,
      args: [
        mockRobot.name,
        Fixtures.mockNetworkingStatusSuccess.body.status,
        Fixtures.mockNetworkingStatusSuccess.body.interfaces,
        mockRequestMeta,
      ],
      expected: {
        type: 'networking:FETCH_STATUS_SUCCESS',
        payload: {
          robotName: mockRobot.name,
          internetStatus: Fixtures.mockNetworkingStatusSuccess.body.status,
          interfaces: Fixtures.mockNetworkingStatusSuccess.body.interfaces,
        },
        meta: mockRequestMeta,
      },
    },
    {
      name: 'networking:FETCH_STATUS_FAILURE',
      creator: Actions.fetchStatusFailure,
      args: [
        mockRobot.name,
        Fixtures.mockNetworkingStatusFailure.body,
        mockRequestMeta,
      ],
      expected: {
        type: 'networking:FETCH_STATUS_FAILURE',
        payload: {
          robotName: mockRobot.name,
          error: Fixtures.mockNetworkingStatusFailure.body,
        },
        meta: mockRequestMeta,
      },
    },
    {
      name: 'networking:FETCH_WIFI_LIST',
      creator: Actions.fetchWifiList,
      args: [mockRobot.name],
      expected: {
        type: 'networking:FETCH_WIFI_LIST',
        payload: { robotName: mockRobot.name },
        meta: {},
      },
    },
    {
      name: 'networking:FETCH_WIFI_LIST_SUCCESS',
      creator: Actions.fetchWifiListSuccess,
      args: [
        mockRobot.name,
        Fixtures.mockWifiListSuccess.body.list,
        mockRequestMeta,
      ],
      expected: {
        type: 'networking:FETCH_WIFI_LIST_SUCCESS',
        payload: {
          robotName: mockRobot.name,
          wifiList: Fixtures.mockWifiListSuccess.body.list,
        },
        meta: mockRequestMeta,
      },
    },
    {
      name: 'networking:FETCH_WIFI_LIST_FAILURE',
      creator: Actions.fetchWifiListFailure,
      args: [
        mockRobot.name,
        Fixtures.mockWifiListFailure.body,
        mockRequestMeta,
      ],
      expected: {
        type: 'networking:FETCH_WIFI_LIST_FAILURE',
        payload: {
          robotName: mockRobot.name,
          error: Fixtures.mockWifiListFailure.body,
        },
        meta: mockRequestMeta,
      },
    },
    {
      name: 'networking:POST_WIFI_CONFIGURE',
      creator: Actions.postWifiConfigure,
      args: [mockRobot.name, { ssid: 'network-name', psk: 'network-password' }],
      expected: {
        type: 'networking:POST_WIFI_CONFIGURE',
        payload: {
          robotName: mockRobot.name,
          options: { ssid: 'network-name', psk: 'network-password' },
        },
        meta: {},
      },
    },
    {
      name: 'networking:POST_WIFI_CONFIGURE_SUCCESS',
      creator: Actions.postWifiConfigureSuccess,
      args: [mockRobot.name, 'network-name', mockRequestMeta],
      expected: {
        type: 'networking:POST_WIFI_CONFIGURE_SUCCESS',
        payload: {
          robotName: mockRobot.name,
          ssid: 'network-name',
        },
        meta: mockRequestMeta,
      },
    },
    {
      name: 'networking:POST_WIFI_CONFIGURE_FAILURE',
      creator: Actions.postWifiConfigureFailure,
      args: [
        mockRobot.name,
        Fixtures.mockWifiConfigureFailure.body,
        mockRequestMeta,
      ],
      expected: {
        type: 'networking:POST_WIFI_CONFIGURE_FAILURE',
        payload: {
          robotName: mockRobot.name,
          error: Fixtures.mockWifiListFailure.body,
        },
        meta: mockRequestMeta,
      },
    },
  ]

  SPECS.forEach(spec => {
    const { name, creator, args, expected } = spec
    test(name, () => expect(creator(...args)).toEqual(expected))
  })
})
