// mock HTTP responses for pipettes endpoints
import { fixtureP10Single } from '@opentrons/shared-data/pipette/fixtures/name'
import type {
  AttachedPipette,
  PipetteInfo,
  PipetteSettings,
  PipetteSettingsFieldsMap,
  PipetteInformation,
} from '../types'
import type {
  RobotApiResponse,
  RobotApiResponseMeta,
} from '../../robot-api/types'
import { mockTipRackDefinition } from '../../custom-labware/__fixtures__'
import type { PipetteData } from '@opentrons/api-client'

export const mockRobot = { name: 'robot', ip: '127.0.0.1', port: 31950 }

// fetch pipette fixtures

export const mockAttachedPipette: Omit<AttachedPipette, 'modelSpecs'> = {
  id: 'abc',
  name: 'p300_single_gen2',
  model: 'p300_single_v2.0',
  tip_length: 42,
  mount_axis: 'c',
  plunger_axis: 'd',
}

export const mockP300PipetteSpecs: any = {
  displayName: 'P300 Single-Channel GEN2',
  name: 'p300_single_gen2',
  backCompatNames: ['p300_single'],
}

export const mockUnattachedPipette = {
  id: null,
  name: null,
  model: null,
  mount_axis: 'a',
  plunger_axis: 'b',
}

export const mockAttachedFlexPipette: Omit<AttachedPipette, 'modelSpecs'> = {
  id: 'abc',
  name: 'p1000_single_flex',
  model: 'p1000_single_v3.0',
  tip_length: 42,
  mount_axis: 'c',
  plunger_axis: 'd',
}

export const mockFlexP1000PipetteSpecs: any = {
  displayName: 'Flex 1-Channel 1000 µL',
  name: 'p1000_single_flex',
  backCompatNames: ['p1000_single'],
  channels: 1,
}

export const mockFlexP1000Pipette8ChannelSpecs: any = {
  displayName: 'Flex 8-Channel 1000 µL',
  name: 'p1000_multi_flex',
  channels: 8,
  backCompatNames: ['p1000_multi'],
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

export const mockPipetteSettingsFieldsMap: PipetteSettingsFieldsMap = {
  top: {
    units: 'string',
    type: 'float',
    min: 0,
    max: 10,
    default: 0,
    value: 4,
  },
  bottom: {
    units: 'string',
    type: 'float',
    min: 0,
    max: 10,
    default: 0,
    value: 3,
  },
  blowout: {
    units: 'string',
    type: 'float',
    min: 0,
    max: 10,
    default: 0,
    value: 2,
  },
  dropTip: {
    units: 'string',
    type: 'float',
    min: 0,
    max: 10,
    default: 0,
    value: 1,
  },
  pickUpCurrent: {
    units: 'string',
    type: 'float',
    min: 0,
    max: 0,
    default: 0,
    value: 0,
  },
  pickUpDistance: {
    units: 'string',
    type: 'float',
    min: 0,
    max: 0,
    default: 0,
    value: 0,
  },
  pickUpIncrement: {
    units: 'string',
    type: 'float',
    min: 0,
    max: 0,
    default: 0,
    value: 0,
  },
  pickUpPresses: {
    units: 'string',
    type: 'float',
    min: 0,
    max: 0,
    default: 0,
    value: 0,
  },
  pickUpSpeed: {
    units: 'string',
    type: 'float',
    min: 0,
    max: 0,
    default: 0,
    value: 0,
  },
  plungerCurrent: {
    units: 'string',
    type: 'float',
    min: 0,
    max: 0,
    default: 0,
    value: 0,
  },
  dropTipCurrent: {
    units: 'string',
    type: 'float',
    min: 0,
    max: 0,
    default: 0,
    value: 0,
  },
  dropTipSpeed: {
    units: 'string',
    type: 'float',
    min: 0,
    max: 0,
    default: 0,
    value: 0,
  },
  tipLength: {
    units: 'string',
    type: 'float',
    min: 0,
    max: 0,
    default: 0,
    value: 0,
  },
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

export const mockPipetteInfo: PipetteInfo = {
  pipetteSpecs: fixtureP10Single,
  requestedPipetteMatch: 'match',
  pipetteCalDate: '2021-04-10',
  tipRacksForPipette: [
    {
      displayName: 'My TipRack',
      lastModifiedDate: '2021-04-10',
      tipRackDef: mockTipRackDefinition,
    },
  ],
}

export const mockLeftPipette: any = {
  id: 'abc',
  model: 'mock_left_model',
}

export const mockRightPipette: any = {
  id: 'def',
  model: 'mock_right_model',
}

export const mockLeftSpecs: any = {
  displayName: 'Left Pipette',
  name: 'mock_left',
  backCompatNames: ['mock_left_legacy'],
}

export const mockLeftLegacySpecs: any = {
  displayName: 'Left Pipette Legacy',
  name: 'mock_left_legacy',
}

export const mockRightSpecs: any = {
  displayName: 'Right Pipette',
  name: 'mock_right',
}

// NOTE: protocol pipettes use "pipetteName" for the exact "model" because reasons
export const mockLeftProtoPipette: any = {
  mount: 'left',
  pipetteName: 'mock_left_model',
  modelSpecs: mockLeftSpecs,
}

export const mockRightProtoPipette: any = {
  mount: 'right',
  pipetteName: 'mock_right_model',
  modelSpecs: mockRightSpecs,
}

export const mockLeftPipetteCalibration: any = {
  pipette: 'abc',
  mount: 'left',
  offset: [0, 1, 2],
  tiprack: 'some-tiprack',
  lastModified: '2020-08-30T10:02',
}

export const mockRightPipetteCalibration: any = {
  pipette: 'def',
  mount: 'right',
  offset: [1, 2, 3],
  tiprack: 'some-other-tiprack',
  lastModified: '2020-08-25T20:25',
}

export const mockPipetteData1Channel: PipetteData = {
  data: {
    channels: 1,
    min_volume: 1,
    max_volume: 50,
    calibratedOffset: {
      offset: { x: 0, y: 2, z: 1 },
      source: 'default',
      last_modified: '2020-08-25T20:25',
    },
  },
  instrumentModel: 'p1000_single_v3.0',
  instrumentName: 'p1000_single_flex',
  instrumentType: 'pipette',
  mount: 'left',
  serialNumber: 'abc',
  subsystem: 'pipette_left',
  ok: true,
  state: {
    tipDetected: false,
  },
}
export const mockAttachedPipetteInformation: PipetteInformation = {
  ...mockPipetteData1Channel,
  displayName: 'Flex 1-Channel 1000 µL',
}

export const mockPipetteData8Channel: PipetteData = {
  data: {
    channels: 8,
    min_volume: 1,
    max_volume: 50,
    calibratedOffset: {
      offset: { x: 0, y: 2, z: 1 },
      source: 'default',
      last_modified: '2020-08-25T20:25',
    },
  },
  firmwareVersion: '12',
  instrumentModel: 'p1000_multi_v3.0',
  instrumentName: 'p1000_multi_flex',
  instrumentType: 'pipette',
  mount: 'right',
  serialNumber: 'cba',
  subsystem: 'pipette_right',
  ok: true,
  state: {
    tipDetected: false,
  },
}
export const mock8ChannelAttachedPipetteInformation: PipetteInformation = {
  ...mockPipetteData8Channel,
  displayName: 'Flex 8-Channel 1000 µL',
}

export const mockPipetteData96Channel: PipetteData = {
  data: {
    channels: 96,
    min_volume: 1,
    max_volume: 50,
    calibratedOffset: {
      offset: { x: 0, y: 2, z: 1 },
      source: 'default',
      last_modified: '2020-08-25T20:25',
    },
  },
  instrumentModel: 'p1000_96_v1',
  instrumentName: 'p1000_96',
  instrumentType: 'pipette',
  mount: 'left',
  serialNumber: 'cba',
  subsystem: 'pipette_left',
  ok: true,
  state: {
    tipDetected: false,
  },
}
export const mock96ChannelAttachedPipetteInformation: PipetteInformation = {
  ...mockPipetteData96Channel,
  displayName: 'Flex 96-Channel 1000 µL',
}
