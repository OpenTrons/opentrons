// mock HTTP responses for pipettes endpoints

import type { PipetteSettings } from '../types'
import type {
  RobotApiResponse,
  RobotApiResponseMeta,
} from '../../robot-api/types'

export const mockRobot = { name: 'robot', ip: '127.0.0.1', port: 31950 }

// fetch pipette fixtures

export const mockAttachedPipette = {
  id: 'abc',
  name: 'p300_single_gen2',
  model: 'p300_single_v2.0',
  tip_length: 42,
  mount_axis: 'c',
  plunger_axis: 'd',
}

export const mockUnattachedPipette = {
  id: null,
  name: null,
  model: null,
  mount_axis: 'a',
  plunger_axis: 'b',
}

export const mockFetchPipettesSuccessMeta: RobotApiResponseMeta = {
  method: 'GET',
  path: '/pipettes',
  ok: true,
  status: 200,
}

export const mockFetchPipettesSuccess: RobotApiResponse = {
  ...mockFetchPipettesSuccessMeta,
  host: mockRobot,
  body: {
    left: mockUnattachedPipette,
    right: mockAttachedPipette,
  },
}

export const mockFetchPipettesFailureMeta: RobotApiResponseMeta = {
  method: 'GET',
  path: '/pipettes',
  ok: false,
  status: 500,
}

export const mockFetchPipettesFailure: RobotApiResponse = {
  ...mockFetchPipettesFailureMeta,
  host: mockRobot,
  body: { message: 'AH' },
}

// fetch pipette settings fixtures

export const mockPipetteSettings: PipetteSettings = {
  info: { name: 'p300_single_gen2', model: 'p300_single_v2.0' },
  fields: { fieldId: { value: 42, default: 42 } },
}

export const mockFetchPipetteSettingsSuccessMeta: RobotApiResponseMeta = {
  method: 'GET',
  path: '/pipettes/settings',
  ok: true,
  status: 200,
}

export const mockFetchPipetteSettingsSuccess: RobotApiResponse = {
  ...mockFetchPipetteSettingsSuccessMeta,
  host: mockRobot,
  body: { abc: mockPipetteSettings } as {
    [key: string]: PipetteSettings
  },
}

export const mockFetchPipetteSettingsFailureMeta: RobotApiResponseMeta = {
  method: 'GET',
  path: '/pipettes/settings',
  ok: false,
  status: 500,
}

export const mockFetchPipetteSettingsFailure: RobotApiResponse = {
  ...mockFetchPipetteSettingsFailureMeta,
  host: mockRobot,
  body: { message: 'AH' },
}

// update pipette settings fixtures

export const mockUpdatePipetteSettingsSuccessMeta: RobotApiResponseMeta = {
  method: 'PATCH',
  path: '/pipettes/settings/abc',
  ok: true,
  status: 200,
}

export const mockUpdatePipetteSettingsSuccess: RobotApiResponse = {
  ...mockUpdatePipetteSettingsSuccessMeta,
  host: mockRobot,
  body: { fields: mockPipetteSettings.fields },
}

export const mockUpdatePipetteSettingsFailureMeta: RobotApiResponseMeta = {
  method: 'PATCH',
  path: '/pipettes/settings/abc',
  ok: false,
  status: 500,
}

export const mockUpdatePipetteSettingsFailure: RobotApiResponse = {
  ...mockUpdatePipetteSettingsFailureMeta,
  host: mockRobot,
  body: { message: 'AH' },
}
