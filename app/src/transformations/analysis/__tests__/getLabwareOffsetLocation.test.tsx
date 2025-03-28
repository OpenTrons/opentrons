import { when } from 'vitest-when'
import { describe, it, beforeEach, vi, expect, afterEach } from 'vitest'

import {
  getLabwareDefURI,
  multiple_tipacks_with_tc,
  opentrons96PcrAdapterV1,
} from '@opentrons/shared-data'
import { getLegacyLabwareOffsetLocation } from '../getLegacyLabwareOffsetLocation'
import {
  getModuleInitialLoadInfo,
  getLabwareLocation,
} from '/app/transformations/commands'
import type {
  LoadedLabware,
  LoadedModule,
  LabwareDefinition2,
  CompletedProtocolAnalysis,
} from '@opentrons/shared-data'

vi.mock('/app/transformations/commands')

const protocolWithTC = (multiple_tipacks_with_tc as unknown) as CompletedProtocolAnalysis
const mockAdapterDef = opentrons96PcrAdapterV1 as LabwareDefinition2
const mockAdapterId = 'mockAdapterId'
const TCModelInProtocol = 'thermocyclerModuleV1'
const MOCK_SLOT = '2'
const TCIdInProtocol =
  '18f0c1b0-0122-11ec-88a3-f1745cf9b36c:thermocyclerModuleType' // this is just taken from the protocol fixture

describe('getLabwareOffsetLocation', () => {
  let MOCK_LABWARE_ID: string
  let MOCK_COMMANDS: CompletedProtocolAnalysis['commands']
  let MOCK_MODULES: LoadedModule[]
  let MOCK_LABWARE: LoadedLabware[]
  beforeEach(() => {
    MOCK_LABWARE_ID = 'some_labware'
    MOCK_COMMANDS = protocolWithTC.commands
    MOCK_MODULES = [
      {
        id: TCIdInProtocol,
        model: 'thermocyclerModuleV1',
      },
    ] as LoadedModule[]
    MOCK_LABWARE = [
      {
        id: mockAdapterId,
        loadName: mockAdapterDef.parameters.loadName,
        definitionUri: getLabwareDefURI(mockAdapterDef),
        location: { moduleId: TCIdInProtocol },
        displayName: 'adapter nickname',
      },
    ]
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })
  it('should return just the slot name if the labware is not on top of a module or adapter', () => {
    const MOCK_SLOT = '2'
    when(vi.mocked(getLabwareLocation))
      .calledWith(MOCK_LABWARE_ID, MOCK_COMMANDS)
      .thenReturn({ slotName: MOCK_SLOT })

    expect(
      getLegacyLabwareOffsetLocation(
        MOCK_LABWARE_ID,
        MOCK_COMMANDS,
        MOCK_MODULES,
        []
      )
    ).toEqual({ slotName: MOCK_SLOT })
  })
  it('should return null if the location is off deck', () => {
    when(vi.mocked(getLabwareLocation))
      .calledWith(MOCK_LABWARE_ID, MOCK_COMMANDS)
      .thenReturn('offDeck')

    expect(
      getLegacyLabwareOffsetLocation(
        MOCK_LABWARE_ID,
        MOCK_COMMANDS,
        MOCK_MODULES,
        []
      )
    ).toEqual(null)
  })
  it('should return the slot name and module model if the labware is on top of a module', () => {
    when(vi.mocked(getLabwareLocation))
      .calledWith(MOCK_LABWARE_ID, MOCK_COMMANDS)
      .thenReturn({ moduleId: TCIdInProtocol })
    when(vi.mocked(getModuleInitialLoadInfo))
      .calledWith(TCIdInProtocol, MOCK_COMMANDS)
      .thenReturn({ location: { slotName: MOCK_SLOT } } as any)

    expect(
      getLegacyLabwareOffsetLocation(
        MOCK_LABWARE_ID,
        MOCK_COMMANDS,
        MOCK_MODULES,
        []
      )
    ).toEqual({ slotName: MOCK_SLOT, moduleModel: TCModelInProtocol })
  })

  it('should return the slot name, module model and definition uri for labware on adapter on mod', () => {
    vi.mocked(getLabwareLocation).mockReturnValue({ labwareId: mockAdapterId })
    vi.mocked(getModuleInitialLoadInfo).mockReturnValue({
      location: { slotName: MOCK_SLOT },
    } as any)
    expect(
      getLegacyLabwareOffsetLocation(
        MOCK_LABWARE_ID,
        MOCK_COMMANDS,
        MOCK_MODULES,
        MOCK_LABWARE
      )
    ).toEqual({
      slotName: MOCK_SLOT,
      moduleModel: TCModelInProtocol,
      definitionUri: getLabwareDefURI(mockAdapterDef),
    })
  })

  it('should return the slot name and definition uri for labware on adapter on deck', () => {
    MOCK_LABWARE = [
      {
        id: mockAdapterId,
        loadName: mockAdapterDef.parameters.loadName,
        definitionUri: getLabwareDefURI(mockAdapterDef),
        location: { slotName: MOCK_SLOT },
        displayName: 'adapter nickname',
      },
    ]
    MOCK_MODULES = []
    vi.mocked(getLabwareLocation).mockReturnValue({ labwareId: mockAdapterId })
    expect(
      getLegacyLabwareOffsetLocation(
        MOCK_LABWARE_ID,
        MOCK_COMMANDS,
        MOCK_MODULES,
        MOCK_LABWARE
      )
    ).toEqual({
      slotName: MOCK_SLOT,
      definitionUri: getLabwareDefURI(mockAdapterDef),
    })
  })
})
