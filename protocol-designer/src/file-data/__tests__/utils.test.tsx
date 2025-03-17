import { describe, it, expect } from 'vitest'
import {
  fixture96Plate,
  fixtureP1000SingleV2Specs,
} from '@opentrons/shared-data'
import {
  getLabwareLoadInfo,
  getModulesLoadInfo,
  getPipettesLoadInfo,
} from '../selectors/utils'
import type { LabwareDefinition2, PipetteName } from '@opentrons/shared-data'

describe('getPipettesLoadInfo', () => {
  it('returns pipettes from pipette entities', () => {
    const pipId = '1'
    const results = {
      [pipId]: {
        pipetteName: fixtureP1000SingleV2Specs.displayName,
      },
    }
    expect(
      getPipettesLoadInfo({
        pipId: {
          spec: fixtureP1000SingleV2Specs,
          tiprackLabwareDef: [],
          name: fixtureP1000SingleV2Specs.displayName as PipetteName,
          id: pipId,
          tiprackDefURI: [],
          pythonName: 'mockPythonName',
        },
      })
    ).toEqual(results)
  })
})

describe('getModuleLoadInfo', () => {
  it('returns modules from module entities', () => {
    const moduleId = '1'
    const results = {
      [moduleId]: {
        model: 'magneticModuleV2',
      },
    }
    expect(
      getModulesLoadInfo({
        moduleId: {
          id: moduleId,
          model: 'magneticModuleV2',
          type: 'magneticModuleType',
          pythonName: 'mockPythonName',
        },
      })
    ).toEqual(results)
  })
})

describe('getLabwareLoadInfo', () => {
  it('returns labwares from labware entities', () => {
    const labwareId = '1'
    const uri = 'mockUri'
    const results = {
      [labwareId]: {
        displayName: 'nick name',
        labwareDefURI: uri,
      },
    }
    const labwareNicknamesById: Record<string, string> = {
      [labwareId]: 'nick name',
    }

    expect(
      getLabwareLoadInfo(
        {
          labwareId: {
            id: labwareId,
            labwareDefURI: uri,
            def: fixture96Plate as LabwareDefinition2,
            pythonName: 'mockPythonName',
          },
        },
        labwareNicknamesById
      )
    ).toEqual(results)
  })
})
