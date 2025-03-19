import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import Ajv from 'ajv'
import {
  commandSchemaV8,
  fixtureP10SingleV2Specs,
  fixtureP300SingleV2Specs,
  labwareSchemaV2,
  protocolSchemaV8,
  OT2_ROBOT_TYPE,
} from '@opentrons/shared-data'
import {
  fixture_12_trough,
  fixture_96_plate,
  fixture_tiprack_10_ul,
  fixture_tiprack_300_ul,
} from '@opentrons/shared-data/labware/fixtures/2'
import { getLoadLiquidCommands } from '../../load-file/migration/utils/getLoadLiquidCommands'
import {
  createFile,
  createPythonFile,
  getLabwareDefinitionsInUse,
} from '../selectors'
import {
  fileMetadata,
  dismissedWarnings,
  ingredients,
  ingredLocations,
  labwareEntities,
  labwareNicknamesById,
  labwareDefsByURI,
  pipetteEntities,
} from '../__fixtures__/createFile/commonFields'
import * as v7Fixture from '../__fixtures__/createFile/v7Fixture'
import type { LabwareDefinition2 } from '@opentrons/shared-data'
import type {
  LabwareEntities,
  PipetteEntities,
} from '../../../../step-generation/src/types'
import type { LabwareDefByDefURI } from '../../labware-defs'

vi.mock('../../load-file/migration/utils/getLoadLiquidCommands')

const ajv = new Ajv({
  allErrors: true,
  jsonPointers: true,
})
// v3 and v4 protocol schema contain reference to v2 labware schema, so give AJV access to it
// and add v8 command schema
ajv.addSchema(labwareSchemaV2)
ajv.addSchema(commandSchemaV8)

const validateProtocol = ajv.compile(protocolSchemaV8)

const expectResultToMatchSchema = (result: any): void => {
  const valid = validateProtocol(result)
  const validationErrors = validateProtocol.errors

  if (validationErrors) {
    console.log(JSON.stringify(validationErrors, null, 4))
  }

  expect(valid).toBe(true)
  expect(validationErrors).toBe(null)
}

describe('createFile selector', () => {
  beforeEach(() => {
    vi.mocked(getLoadLiquidCommands).mockReturnValue([])
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })
  const entities = {
    moduleEntities: v7Fixture.moduleEntities,
    labwareEntities,
    pipetteEntities,
    liquidEntities: ingredients,
  }
  it('should return a schema-valid JSON V8 protocol', () => {
    // @ts-expect-error(sa, 2021-6-15): resultFunc not part of Selector type
    const result = createFile.resultFunc(
      fileMetadata,
      v7Fixture.initialRobotState,
      v7Fixture.robotStateTimeline,
      OT2_ROBOT_TYPE,
      dismissedWarnings,
      ingredLocations,
      v7Fixture.savedStepForms,
      v7Fixture.orderedStepIds,
      labwareNicknamesById,
      labwareDefsByURI,
      {},
      entities
    )
    expectResultToMatchSchema(result)

    expect(vi.mocked(getLoadLiquidCommands)).toHaveBeenCalledWith(
      ingredients,
      ingredLocations
    )
  })

  it('should return a valid Python protocol file', () => {
    // @ts-expect-error(sa, 2021-6-15): resultFunc not part of Selector type
    const result = createPythonFile.resultFunc(
      fileMetadata,
      OT2_ROBOT_TYPE,
      entities,
      v7Fixture.initialRobotState,
      v7Fixture.robotStateTimeline,
      ingredLocations,
      labwareNicknamesById
    )
    // This is just a quick smoke test to make sure createPythonFile() produces
    // something that looks like a Python file. The individual sections of the
    // generated Python will be tested in separate unit tests.
    expect(result).toBe(
      `
from contextlib import nullcontext as pd_step
from opentrons import protocol_api, types

metadata = {
    "protocolName": "Test Protocol",
    "author": "The Author",
    "description": "Protocol description",
    "created": "2020-02-25T21:48:32.515Z",
    "protocolDesigner": "fake_PD_version",
    "source": "Protocol Designer",
}

requirements = {
    "robotType": "OT-2",
    "apiLevel": "2.23",
}

def run(protocol: protocol_api.ProtocolContext):
    # Load Labware:
    mock_python_name_1 = protocol.load_labware(
        "fixture_trash",
        "12",
        label="Trash",
        namespace="fixture",
        version=1,
    )
    mock_python_name_2 = protocol.load_labware(
        "fixture_tiprack_10_ul",
        "1",
        label="Opentrons 96 Tip Rack 10 µL",
        namespace="fixture",
        version=1,
    )
    mock_python_name_3 = protocol.load_labware(
        "fixture_96_plate",
        "7",
        label="NEST 96 Well Plate 100 µL PCR Full Skirt",
        namespace="fixture",
        version=1,
    )

    # Load Pipettes:
    mock_python_name_1 = protocol.load_instrument("p10_single", "left", tip_racks=[mock_python_name_2])

    # PROTOCOL STEPS

    # Step 1:
    pass
`.trimStart()
    )
  })
})

describe('getLabwareDefinitionsInUse util', () => {
  it('should exclude definitions that are neither on the deck nor assigned to a pipette', () => {
    const assignedTiprackOnDeckDef = fixture_tiprack_10_ul
    const assignedTiprackNotOnDeckDef = fixture_tiprack_300_ul
    const nonTiprackLabwareOnDeckDef = fixture_12_trough
    const nonTiprackLabwareNotOnDeckDef = fixture_96_plate
    // NOTE that assignedTiprackNotOnDeckDef and nonTiprackLabwareNotOnDeckDef are
    // missing from LabwareEntities bc they're not on the deck
    const labwareEntities: LabwareEntities = {
      someLabwareId: {
        id: 'someLabwareId',
        def: assignedTiprackOnDeckDef as LabwareDefinition2,
        labwareDefURI: 'assignedTiprackOnDeckURI',
        pythonName: 'mockPythonName',
      },
      otherLabwareId: {
        id: 'otherLabwareId',
        def: nonTiprackLabwareOnDeckDef as LabwareDefinition2,
        labwareDefURI: 'nonTiprackLabwareOnDeckURI',
        pythonName: 'mockPythonName',
      },
    }
    const allLabwareDefsByURI: LabwareDefByDefURI = {
      assignedTiprackOnDeckURI: assignedTiprackOnDeckDef as LabwareDefinition2,
      assignedTiprackNotOnDeckURI: assignedTiprackNotOnDeckDef as LabwareDefinition2,
      nonTiprackLabwareOnDeckURI: nonTiprackLabwareOnDeckDef as LabwareDefinition2,
      nonTiprackLabwareNotOnDeckURI: nonTiprackLabwareNotOnDeckDef as LabwareDefinition2,
    }
    const pipetteEntities: PipetteEntities = {
      somePipetteId: {
        id: 'somePipetteId',
        // @ts-expect-error(sa, 2021-6-18): not a valid pipette name
        name: 'foo',
        spec: fixtureP10SingleV2Specs,
        tiprackLabwareDef: [assignedTiprackOnDeckDef] as LabwareDefinition2[],
        tiprackDefURI: ['assignedTiprackOnDeckURI'],
      },
      otherPipetteId: {
        id: 'otherPipetteId',
        // @ts-expect-error(sa, 2021-6-18): not a valid pipette name
        name: 'foo',
        spec: fixtureP300SingleV2Specs,
        tiprackLabwareDef: [
          assignedTiprackNotOnDeckDef,
        ] as LabwareDefinition2[],
        tiprackDefURI: ['assignedTiprackNotOnDeckURI'],
      },
    }
    const result = getLabwareDefinitionsInUse(
      labwareEntities,
      pipetteEntities,
      allLabwareDefsByURI
    )
    expect(result).toEqual({
      assignedTiprackOnDeckURI: assignedTiprackOnDeckDef,
      assignedTiprackNotOnDeckURI: assignedTiprackNotOnDeckDef,
      nonTiprackLabwareOnDeckURI: nonTiprackLabwareOnDeckDef,
    })
  })
})
