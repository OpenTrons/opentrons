import { describe, it, expect } from 'vitest'

import * as Actions from '../actions'
import type { RobotAdminAction } from '../types'

interface ActionSpec {
  name: string
  creator: (...args: any[]) => unknown
  args: unknown[]
  expected: RobotAdminAction
}

describe('robot admin actions', () => {
  const SPECS: ActionSpec[] = [
    {
      name: 'robotAdmin:RESTART',
      creator: Actions.restartRobot,
      args: ['robotName'],
      expected: {
        type: 'robotAdmin:RESTART',
        payload: { robotName: 'robotName' },
        meta: { robot: true },
      },
    },
    {
      name: 'robotAdmin:RESTART_SUCCESS',
      creator: Actions.restartRobotSuccess,
      args: ['robotName', { requestId: 'foo' }],
      expected: {
        type: 'robotAdmin:RESTART_SUCCESS',
        payload: { robotName: 'robotName' },
        meta: { requestId: 'foo' } as any,
      },
    },
    {
      name: 'robotAdmin:RESTART_FAILURE',
      creator: Actions.restartRobotFailure,
      args: ['robotName', { message: 'AH' }, { requestId: 'foo' }],
      expected: {
        type: 'robotAdmin:RESTART_FAILURE',
        payload: { robotName: 'robotName', error: { message: 'AH' } },
        meta: { requestId: 'foo' } as any,
      },
    },
    {
      name: 'robotAdmin:FETCH_RESET_CONFIG_OPTIONS',
      creator: Actions.fetchResetConfigOptions,
      args: ['robotName'],
      expected: {
        type: 'robotAdmin:FETCH_RESET_CONFIG_OPTIONS',
        payload: { robotName: 'robotName' },
        meta: {} as any,
      },
    },
    {
      name: 'robotAdmin:FETCH_RESET_CONFIG_OPTIONS_SUCCESS',
      creator: Actions.fetchResetConfigOptionsSuccess,
      args: [
        'robotName',
        [
          { id: 'foo', name: 'Foo', description: 'foobar' },
          { id: 'bar', name: 'Bar', description: 'bazqux' },
        ],
        { requestId: 'foo' },
      ],
      expected: {
        type: 'robotAdmin:FETCH_RESET_CONFIG_OPTIONS_SUCCESS',
        payload: {
          robotName: 'robotName',
          options: [
            { id: 'foo', name: 'Foo', description: 'foobar' },
            { id: 'bar', name: 'Bar', description: 'bazqux' },
          ],
        },
        meta: { requestId: 'foo' } as any,
      },
    },
    {
      name: 'robotAdmin:FETCH_RESET_CONFIG_OPTIONS_FAILURE',
      creator: Actions.fetchResetConfigOptionsFailure,
      args: ['robotName', { message: 'AH' }, { requestId: 'foo' }],
      expected: {
        type: 'robotAdmin:FETCH_RESET_CONFIG_OPTIONS_FAILURE',
        payload: { robotName: 'robotName', error: { message: 'AH' } },
        meta: { requestId: 'foo' } as any,
      },
    },
    {
      name: 'robotAdmin:RESET_CONFIG',
      creator: Actions.resetConfig,
      args: [
        'robotName',
        {
          resetLabwareOffsets: true,
          settingsResets: { foo: true, bar: false },
        },
      ],
      expected: {
        type: 'robotAdmin:RESET_CONFIG',
        payload: {
          robotName: 'robotName',
          resets: {
            resetLabwareOffsets: true,
            settingsResets: { foo: true, bar: false },
          },
        },
        meta: {} as any,
      },
    },
    {
      name: 'robotAdmin:RESET_CONFIG_SUCCESS',
      creator: Actions.resetConfigSuccess,
      args: ['robotName', { requestId: 'foo' }],
      expected: {
        type: 'robotAdmin:RESET_CONFIG_SUCCESS',
        payload: { robotName: 'robotName' },
        meta: { requestId: 'foo' } as any,
      },
    },
    {
      name: 'robotAdmin:RESET_CONFIG_FAILURE',
      creator: Actions.resetConfigFailure,
      args: ['robotName', { message: 'AH' }, { requestId: 'foo' }],
      expected: {
        type: 'robotAdmin:RESET_CONFIG_FAILURE',
        payload: { robotName: 'robotName', error: { message: 'AH' } },
        meta: { requestId: 'foo' } as any,
      },
    },
    {
      name: 'robotAdmin:SYNC_SYSTEM_TIME',
      creator: Actions.syncSystemTime,
      args: ['robotName'],
      expected: {
        type: 'robotAdmin:SYNC_SYSTEM_TIME',
        payload: { robotName: 'robotName' },
        meta: {} as any,
      },
    },
  ]

  SPECS.forEach(spec => {
    const { name, creator, args, expected } = spec
    it(name, () => {
      expect(creator(...args)).toEqual(expected)
    })
  })
})
