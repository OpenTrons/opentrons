import uuidv1 from 'uuid/v4'
import {
  consolidate,
  transfer,
  distribute,
  getWasteChuteAddressableAreaNamePip,
} from '@opentrons/step-generation'
import { generateQuickTransferArgs } from './'
import {
  FLEX_ROBOT_TYPE,
  FLEX_STANDARD_DECKID,
  getDeckDefFromRobotType,
  TRASH_BIN_ADAPTER_FIXTURE,
  WASTE_CHUTE_FIXTURES,
} from '@opentrons/shared-data'
import type {
  AddressableAreaName,
  DeckConfiguration,
  CommandAnnotationV1Mixin,
  CommandV8Mixin,
  CreateCommand,
  CutoutId,
  LabwareV2Mixin,
  LiquidV1Mixin,
  LoadLabwareCreateCommand,
  LoadPipetteCreateCommand,
  OT3RobotMixin,
  LabwareDefinition2,
} from '@opentrons/shared-data'
import type { CommandCreatorResult } from '@opentrons/step-generation'
import type { QuickTransferSummaryState } from '../types'

const uuid: () => string = uuidv1

export function createQuickTransferFile(
  quickTransferState: QuickTransferSummaryState,
  deckConfig: DeckConfiguration,
  protocolName?: string
): File {
  const {
    stepArgs,
    invariantContext,
    initialRobotState,
  } = generateQuickTransferArgs(quickTransferState, deckConfig)
  const pipetteEntity = Object.values(invariantContext.pipetteEntities)[0]

  const loadPipetteCommand: LoadPipetteCreateCommand = {
    key: uuid(),
    commandType: 'loadPipette' as const,
    params: {
      pipetteName: pipetteEntity.name,
      mount: quickTransferState.mount,
      pipetteId: pipetteEntity.id,
    },
  }
  const labwareEntities = Object.values(invariantContext.labwareEntities)
  const loadAdapterCommands = labwareEntities.reduce<
    LoadLabwareCreateCommand[]
  >((acc, entity) => {
    const { def, id } = entity
    const isAdapter = def.allowedRoles?.includes('adapter')
    if (!isAdapter) return acc
    acc.push({
      key: uuid(),
      commandType: 'loadLabware' as const,
      params: {
        displayName: def.metadata.displayName,
        labwareId: id,
        loadName: def.parameters.loadName,
        namespace: def.namespace,
        version: def.version,
        location: { slotName: initialRobotState.labware[id].slot },
      },
    })
    return acc
  }, [])

  const loadLabwareCommands = labwareEntities.reduce<
    LoadLabwareCreateCommand[]
  >((acc, entity) => {
    const { def, id } = entity
    const isAdapter = def.allowedRoles?.includes('adapter')
    if (isAdapter) return acc
    const location = initialRobotState.labware[id].slot
    const isOnAdapter =
      loadAdapterCommands.find(
        command => command.params.labwareId === location
      ) != null

    acc.push({
      key: uuid(),
      commandType: 'loadLabware' as const,
      params: {
        displayName: def.metadata.displayName,
        labwareId: id,
        loadName: def.parameters.loadName,
        namespace: def.namespace,
        version: def.version,
        location: isOnAdapter
          ? { labwareId: location }
          : { slotName: location },
      },
    })
    return acc
  }, [])

  let nonLoadCommandCreator: CommandCreatorResult | null = null
  if (stepArgs?.commandCreatorFnName === 'transfer') {
    nonLoadCommandCreator = transfer(
      stepArgs,
      invariantContext,
      initialRobotState
    )
  } else if (stepArgs?.commandCreatorFnName === 'consolidate') {
    nonLoadCommandCreator = consolidate(
      stepArgs,
      invariantContext,
      initialRobotState
    )
  } else if (stepArgs?.commandCreatorFnName === 'distribute') {
    nonLoadCommandCreator = distribute(
      stepArgs,
      invariantContext,
      initialRobotState
    )
  }

  const nonLoadCommands =
    nonLoadCommandCreator != null && 'commands' in nonLoadCommandCreator
      ? nonLoadCommandCreator.commands
      : []

  let finalDropTipCommands: CreateCommand[] = []
  let addressableAreaName: AddressableAreaName | null = null
  if (
    quickTransferState.dropTipLocation.cutoutFixtureId ===
    TRASH_BIN_ADAPTER_FIXTURE
  ) {
    const trashLocation = quickTransferState.dropTipLocation.cutoutId
    const deckDef = getDeckDefFromRobotType(FLEX_ROBOT_TYPE)
    const cutouts: Record<CutoutId, AddressableAreaName[]> | null =
      deckDef.cutoutFixtures.find(
        cutoutFixture => cutoutFixture.id === 'trashBinAdapter'
      )?.providesAddressableAreas ?? null
    addressableAreaName =
      trashLocation != null && cutouts != null
        ? cutouts[trashLocation]?.[0] ?? null
        : null
  } else if (
    WASTE_CHUTE_FIXTURES.includes(
      quickTransferState.dropTipLocation.cutoutFixtureId
    )
  ) {
    addressableAreaName = getWasteChuteAddressableAreaNamePip(
      pipetteEntity.spec.channels
    )
  }
  if (addressableAreaName == null) {
    console.error(
      `expected to find addressableAreaName with trashBin or wasteChute location but could not`
    )
  } else {
    finalDropTipCommands = [
      {
        key: uuid(),
        commandType: 'moveToAddressableAreaForDropTip',
        params: {
          pipetteId: pipetteEntity.id,
          addressableAreaName,
        },
      },
      {
        key: uuid(),
        commandType: 'dropTipInPlace',
        params: {
          pipetteId: pipetteEntity.id,
        },
      },
    ]
  }

  const commands: CreateCommand[] = [
    loadPipetteCommand,
    ...loadAdapterCommands,
    ...loadLabwareCommands,
    ...nonLoadCommands,
    ...finalDropTipCommands,
  ]
  const sourceLabwareName = quickTransferState.source.metadata.displayName
  let destinationLabwareName = sourceLabwareName
  if (quickTransferState.destination !== 'source') {
    destinationLabwareName = quickTransferState.destination.metadata.displayName
  }
  const protocolBase = {
    $otSharedSchema: '#/protocol/schemas/8',
    schemaVersion: 8,
    metadata: {
      protocolName:
        protocolName ?? `Quick Transfer ${quickTransferState.volume}µL`,
      description: `This quick transfer moves liquids from a ${sourceLabwareName} to a ${destinationLabwareName}`,
      category: null,
      subcategory: null,
      tags: [],
    },
    // see QuickTransferFlow/README.md for versioning details
    designerApplication: {
      name: 'opentrons/quick-transfer',
      version: '1.1.0',
      data: quickTransferState,
    },
  }
  const flexDeckSpec: OT3RobotMixin = {
    robot: {
      model: FLEX_ROBOT_TYPE,
      deckId: FLEX_STANDARD_DECKID,
    },
  }

  const labwareDefinitions = Object.values(
    invariantContext.labwareEntities
  ).reduce<Record<string, LabwareDefinition2>>((acc, entity) => {
    return { ...acc, [entity.labwareDefURI]: entity.def }
  }, {})

  const labwareV2Mixin: LabwareV2Mixin = {
    labwareDefinitionSchemaId: 'opentronsLabwareSchemaV2',
    labwareDefinitions,
  }

  const liquidV1Mixin: LiquidV1Mixin = {
    liquidSchemaId: 'opentronsLiquidSchemaV1',
    liquids: {},
  }

  const commandv8Mixin: CommandV8Mixin = {
    commandSchemaId: 'opentronsCommandSchemaV8',
    commands,
  }

  const commandAnnotionaV1Mixin: CommandAnnotationV1Mixin = {
    commandAnnotationSchemaId: 'opentronsCommandAnnotationSchemaV1',
    commandAnnotations: [],
  }
  const protocolContents = JSON.stringify({
    ...protocolBase,
    ...flexDeckSpec,
    ...labwareV2Mixin,
    ...liquidV1Mixin,
    ...commandv8Mixin,
    ...commandAnnotionaV1Mixin,
  })

  return new File(
    [protocolContents],
    `${protocolBase.metadata.protocolName}.json`
  )
}
