import { INITIAL_STATE, buildrootReducer } from '../reducer'

const BASE_SESSION = {
  robotName: 'robot-name',
  userFileInfo: null,
  step: null,
  token: null,
  pathPrefix: null,
  stage: null,
  progress: null,
  error: null,
}

describe('buildroot reducer', () => {
  const SPECS = [
    {
      name: 'handles buildroot:UPDATE_INFO',
      action: {
        type: 'buildroot:UPDATE_INFO',
        payload: { version: '1.0.0', releaseNotes: 'release notes' },
      },
      initialState: { ...INITIAL_STATE, info: null },
      expected: {
        ...INITIAL_STATE,
        info: { version: '1.0.0', releaseNotes: 'release notes' },
      },
    },
    {
      name: 'handles buildroot:USER_FILE_INFO',
      action: {
        type: 'buildroot:USER_FILE_INFO',
        payload: {
          systemFile: '/path/to/system.zip',
          version: '1.0.0',
          releaseNotes: 'release notes',
        },
      },
      initialState: { ...INITIAL_STATE, session: { robotName: 'robot-name' } },
      expected: {
        ...INITIAL_STATE,
        session: {
          robotName: 'robot-name',
          userFileInfo: {
            systemFile: '/path/to/system.zip',
            version: '1.0.0',
            releaseNotes: 'release notes',
          },
        },
      },
    },
    {
      name: 'handles buildroot:SET_UPDATE_SEEN',
      action: { type: 'buildroot:SET_UPDATE_SEEN' },
      initialState: { ...INITIAL_STATE, seen: false },
      expected: { ...INITIAL_STATE, seen: true },
    },
    {
      name: 'handles buildroot:DOWNLOAD_PROGRESS',
      action: { type: 'buildroot:DOWNLOAD_PROGRESS', payload: 42 },
      initialState: { ...INITIAL_STATE, downloadProgress: null },
      expected: { ...INITIAL_STATE, downloadProgress: 42 },
    },
    {
      name: 'handles buildroot:DOWNLOAD_ERROR',
      action: { type: 'buildroot:DOWNLOAD_ERROR', payload: 'AH' },
      initialState: { ...INITIAL_STATE, downloadError: null },
      expected: { ...INITIAL_STATE, downloadError: 'AH' },
    },
    {
      name: 'handles buildroot:START_UPDATE',
      action: {
        type: 'buildroot:START_UPDATE',
        payload: { robotName: 'robot-name' },
      },
      initialState: { ...INITIAL_STATE, session: null },
      expected: { ...INITIAL_STATE, session: BASE_SESSION },
    },
    {
      name: 'buildroot:START_UPDATE preserves user file info',
      action: {
        type: 'buildroot:START_UPDATE',
        payload: { robotName: 'robot-name' },
      },
      initialState: {
        ...INITIAL_STATE,
        session: {
          ...BASE_SESSION,
          robotName: 'robot-name',
          userFileInfo: { systemFile: 'system.zip' },
        },
      },
      expected: {
        ...INITIAL_STATE,
        session: {
          ...BASE_SESSION,
          robotName: 'robot-name',
          userFileInfo: { systemFile: 'system.zip' },
        },
      },
    },
    {
      name: 'handles buildroot:START_PREMIGRATION',
      action: {
        type: 'buildroot:START_PREMIGRATION',
        payload: { name: 'robot-name', ip: '10.10.0.0', port: 31950 },
      },
      initialState: { ...INITIAL_STATE, session: BASE_SESSION },
      expected: {
        ...INITIAL_STATE,
        session: { ...BASE_SESSION, step: 'premigration' },
      },
    },
    {
      name: 'handles buildroot:PREMIGRATION_DONE',
      action: { type: 'buildroot:PREMIGRATION_DONE' },
      initialState: {
        ...INITIAL_STATE,
        session: { ...BASE_SESSION, step: 'premigration' },
      },
      expected: {
        ...INITIAL_STATE,
        session: { ...BASE_SESSION, step: 'premigrationRestart' },
      },
    },
    {
      name: 'handles robotApi:REQUEST__POST__/session/update/begin',
      action: {
        type: 'robotApi:REQUEST__POST__/session/update/begin',
        payload: { host: { name: 'robot-name' }, body: { token: 'foobar' } },
        meta: { buildrootPrefix: '/session/update', buildrootToken: true },
      },
      initialState: { ...INITIAL_STATE, session: BASE_SESSION },
      expected: {
        ...INITIAL_STATE,
        session: {
          ...BASE_SESSION,
          step: 'getToken',
        },
      },
    },
    {
      name: 'handles robotApi:RESPONSE__POST__/session/update/begin',
      action: {
        type: 'robotApi:RESPONSE__POST__/session/update/begin',
        payload: { host: { name: 'robot-name' }, body: { token: 'foobar' } },
        meta: { buildrootPrefix: '/session/update', buildrootToken: true },
      },
      initialState: { ...INITIAL_STATE, session: BASE_SESSION },
      expected: {
        ...INITIAL_STATE,
        session: {
          ...BASE_SESSION,
          token: 'foobar',
          pathPrefix: '/session/update',
        },
      },
    },
    {
      name: 'handles robotApi:RESPONSE__POST__/session/update/:token/status',
      action: {
        type: 'robotApi:RESPONSE__POST__/session/update/a-token/status',
        payload: {
          host: { name: 'robot-name' },
          body: { stage: 'awaiting-file', progress: 0.1 },
        },
        meta: { buildrootStatus: true },
      },
      initialState: { ...INITIAL_STATE, session: BASE_SESSION },
      expected: {
        ...INITIAL_STATE,
        session: { ...BASE_SESSION, stage: 'awaiting-file', progress: 10 },
      },
    },
    {
      name: 'handles buildroot:UPLOAD_FILE',
      action: {
        type: 'buildroot:UPLOAD_FILE',
        payload: {
          host: { name: 'robot-name' },
          path: '/server/update/a-token/file',
        },
        meta: { shell: true },
      },
      initialState: {
        ...INITIAL_STATE,
        session: { ...BASE_SESSION, step: 'getToken' },
      },
      expected: {
        ...INITIAL_STATE,
        session: { ...BASE_SESSION, step: 'uploadFile' },
      },
    },
    {
      name: 'handles buildroot:FILE_UPLOAD_DONE',
      action: { type: 'buildroot:FILE_UPLOAD_DONE' },
      initialState: {
        ...INITIAL_STATE,
        session: {
          ...BASE_SESSION,
          step: 'uploadFile',
        },
      },
      expected: {
        ...INITIAL_STATE,
        session: {
          ...BASE_SESSION,
          step: 'processFile',
        },
      },
    },
    {
      name: 'handles robotApi:REQUEST__POST__/session/update/:token/commit',
      action: {
        type: 'robotApi:REQUEST__POST__/session/update/a-token/status',
        payload: { host: { name: 'robot-name' } },
        meta: { buildrootCommit: true },
      },
      initialState: {
        ...INITIAL_STATE,
        session: {
          ...BASE_SESSION,
          step: 'processFile',
        },
      },
      expected: {
        ...INITIAL_STATE,
        session: {
          ...BASE_SESSION,
          step: 'commitUpdate',
        },
      },
    },
    {
      name: 'handles robotApi:REQUEST__POST__/server/restart',
      action: {
        type: 'robotApi:REQUEST__POST__/server/restart',
        payload: { host: { name: 'robot-name' } },
        meta: { buildrootRestart: true },
      },
      initialState: {
        ...INITIAL_STATE,
        session: { ...BASE_SESSION, step: 'commitUpdate' },
      },
      expected: {
        ...INITIAL_STATE,
        session: { ...BASE_SESSION, step: 'restart' },
      },
    },
    {
      name: 'handles buildroot:CLEAR_SESSION',
      action: { type: 'buildroot:CLEAR_SESSION' },
      initialState: { ...INITIAL_STATE, session: BASE_SESSION },
      expected: { ...INITIAL_STATE, session: null },
    },
    {
      name: 'handles buildroot:UNEXPECTED_ERROR',
      action: {
        type: 'buildroot:UNEXPECTED_ERROR',
        payload: { message: 'AH!' },
      },
      initialState: { ...INITIAL_STATE, info: null },
      expected: {
        ...INITIAL_STATE,
        session: { ...INITIAL_STATE.session, error: 'AH!' },
      },
    },
    {
      name: 'handles buildroot:PREMIGRATION_ERROR',
      action: {
        type: 'buildroot:PREMIGRATION_ERROR',
        payload: { message: 'AH!' },
      },
      initialState: { ...INITIAL_STATE, info: null },
      expected: {
        ...INITIAL_STATE,
        session: { ...INITIAL_STATE.session, error: 'AH!' },
      },
    },
  ]

  SPECS.forEach(spec => {
    const { name, action, initialState, expected } = spec
    test(name, () =>
      expect(buildrootReducer(initialState, action)).toEqual(expected)
    )
  })
})
