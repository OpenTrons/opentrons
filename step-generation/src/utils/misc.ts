import flatMap from 'lodash/flatMap'
import mapValues from 'lodash/mapValues'
import range from 'lodash/range'
import reduce from 'lodash/reduce'
import {
  getIsTiprack,
  getLabwareDefURI,
  getWellNamePerMultiTip,
  ONE_CHANNEL_WASTE_CHUTE_ADDRESSABLE_AREA,
  EIGHT_CHANNEL_WASTE_CHUTE_ADDRESSABLE_AREA,
  NINETY_SIX_CHANNEL_WASTE_CHUTE_ADDRESSABLE_AREA,
  getDeckDefFromRobotType,
  OT2_ROBOT_TYPE,
  FLEX_ROBOT_TYPE,
} from '@opentrons/shared-data'
import { reduceCommandCreators } from './index'
import {
  delay,
  dispense,
  moveToAddressableArea,
  moveToWell,
} from '../commandCreators/atomic'
import {
  airGapInTrash,
  blowOutInTrash,
  dispenseInTrash,
  airGapInWell,
  airGapInWasteChute,
  blowOutInWasteChute,
  dispenseInWasteChute,
} from '../commandCreators/compound'
import { ZERO_OFFSET } from '../constants'
import { blowOutInWell } from '../commandCreators/atomic/blowOutInWell'
import { curryCommandCreator } from './curryCommandCreator'
import type {
  AddressableAreaName,
  LabwareDefinition2,
  BlowoutParams,
  PipetteChannels,
  NozzleConfigurationStyle,
  CutoutFixtureId,
  RobotType,
  CutoutId,
} from '@opentrons/shared-data'
import type {
  CommandCreator,
  CurriedCommandCreator,
  InvariantContext,
  LabwareEntities,
  LabwareEntity,
  LocationLiquidState,
  PipetteEntity,
  RobotState,
  SourceAndDest,
  TrashBinEntities,
  TrashBinEntity,
  WasteChuteEntities,
  WasteChuteEntity,
} from '../types'
export const AIR: '__air__' = '__air__'
export const SOURCE_WELL_BLOWOUT_DESTINATION: 'source_well' = 'source_well'
export const DEST_WELL_BLOWOUT_DESTINATION: 'dest_well' = 'dest_well'

type trashOrLabware = 'wasteChute' | 'trashBin' | 'labware' | null

export const getCutoutIdByAddressableArea = (
  addressableAreaName: AddressableAreaName,
  cutoutFixtureId: CutoutFixtureId,
  robotType: RobotType
): CutoutId => {
  const deckDef = getDeckDefFromRobotType(robotType)
  const cutoutFixtures = deckDef.cutoutFixtures
  const providesAddressableAreasForAddressableArea = cutoutFixtures.find(
    cutoutFixture => cutoutFixture.id.includes(cutoutFixtureId)
  )?.providesAddressableAreas

  const findCutoutIdByAddressableArea = (
    addressableAreaName: AddressableAreaName
  ): CutoutId | null => {
    if (providesAddressableAreasForAddressableArea != null) {
      for (const cutoutId in providesAddressableAreasForAddressableArea) {
        if (
          providesAddressableAreasForAddressableArea[
            cutoutId as keyof typeof providesAddressableAreasForAddressableArea
          ].includes(addressableAreaName)
        ) {
          return cutoutId as CutoutId
        }
      }
    }
    return null
  }

  const cutoutId = findCutoutIdByAddressableArea(addressableAreaName)

  if (cutoutId == null) {
    throw Error(
      `expected to find cutoutId from addressableAreaName ${addressableAreaName} but could not`
    )
  }
  return cutoutId
}

export function getWasteChuteAddressableAreaNamePip(
  channels: PipetteChannels
): AddressableAreaName {
  switch (channels) {
    case 1: {
      return ONE_CHANNEL_WASTE_CHUTE_ADDRESSABLE_AREA
    }
    case 8: {
      return EIGHT_CHANNEL_WASTE_CHUTE_ADDRESSABLE_AREA
    }
    case 96: {
      return NINETY_SIX_CHANNEL_WASTE_CHUTE_ADDRESSABLE_AREA
    }
  }
}

export function getTrashBinAddressableAreaName(
  trashLocation: CutoutId
): AddressableAreaName {
  const deckDef = getDeckDefFromRobotType(
    trashLocation === ('cutout12' as CutoutId)
      ? OT2_ROBOT_TYPE
      : FLEX_ROBOT_TYPE
  )
  let cutouts: Record<CutoutId, AddressableAreaName[]> | null = null

  if (deckDef.robot.model === FLEX_ROBOT_TYPE) {
    cutouts =
      deckDef.cutoutFixtures.find(
        cutoutFixture => cutoutFixture.id === 'trashBinAdapter'
      )?.providesAddressableAreas ?? null
  }

  if (deckDef.robot.model === FLEX_ROBOT_TYPE && cutouts == null) {
    console.error(
      `expected to find a list of cutouts for the Flex but could not with trashLocation ${trashLocation}`
    )
  }
  //  assume trash location is the fixedTrash for OT-2 if cutouts is null
  return cutouts != null ? cutouts[trashLocation]?.[0] : 'fixedTrash'
}

export function getTrashOrLabware(
  labwareEntities: LabwareEntities,
  wasteChuteEntities: WasteChuteEntities,
  trashBinEntities: TrashBinEntities,
  destinationId: string
): trashOrLabware {
  if (labwareEntities[destinationId] != null) {
    return 'labware'
  } else if (wasteChuteEntities[destinationId] != null) {
    return 'wasteChute'
  } else if (trashBinEntities[destinationId] != null) {
    return 'trashBin'
  } else {
    console.error(
      `expected to determine if dest labware is a labware or waste chute with destLabware ${destinationId} but could not`
    )
    return null
  }
}

export function repeatArray<T>(array: T[], repeats: number): T[] {
  return flatMap(range(repeats), (i: number): T[] => array)
}
interface Vol {
  volume: number
}

/** Total volume of a location ("air" is not included in the sum) */
export function getLocationTotalVolume(loc: LocationLiquidState): number {
  return reduce(
    loc,
    (acc: number, ingredState: Vol, ingredId: string) => {
      return ingredId === AIR ? acc : acc + ingredState.volume
    },
    0
  )
}

/** Breaks a liquid volume state into 2 parts. Assumes all liquids are evenly mixed. */
export function splitLiquid(
  volume: number,
  sourceLiquidState: LocationLiquidState
): SourceAndDest {
  const totalSourceVolume = getLocationTotalVolume(sourceLiquidState)

  if (totalSourceVolume === 0) {
    // Splitting from empty source
    return {
      source: sourceLiquidState,
      dest: {
        [AIR]: {
          volume,
        },
      },
    }
  }

  if (volume > totalSourceVolume) {
    // Take all of source, plus air
    return {
      source: mapValues(sourceLiquidState, () => ({
        volume: 0,
      })),
      dest: {
        ...sourceLiquidState,
        [AIR]: {
          volume: volume - totalSourceVolume,
        },
      },
    }
  }

  const ratios: Record<string, number> = reduce(
    sourceLiquidState,
    (acc: Record<string, number>, ingredState: Vol, ingredId: string) => ({
      ...acc,
      [ingredId]: ingredState.volume / totalSourceVolume,
    }),
    {}
  )
  return Object.keys(sourceLiquidState).reduce(
    (acc, ingredId) => {
      const destVol = ratios[ingredId] * volume
      return {
        source: {
          ...acc.source,
          [ingredId]: {
            volume: sourceLiquidState[ingredId].volume - destVol,
          },
        },
        dest: {
          ...acc.dest,
          [ingredId]: {
            volume: destVol,
          },
        },
      }
    },
    {
      source: {},
      dest: {},
    }
  )
}

/** The converse of splitLiquid. Adds all of one liquid to the other.
 * The args are called 'source' and 'dest', but here they're interchangable.
 */
export function mergeLiquid(
  source: LocationLiquidState,
  dest: LocationLiquidState
): LocationLiquidState {
  return {
    // include all ingreds exclusive to 'dest'
    ...dest,
    ...reduce<LocationLiquidState, LocationLiquidState>(
      source,
      (acc, ingredState: Vol, ingredId: string) => {
        const isCommonIngred = ingredId in dest
        const ingredVolume = isCommonIngred // sum volumes of ingredients common to 'source' and 'dest'
          ? ingredState.volume + dest[ingredId].volume // include all ingreds exclusive to 'source'
          : ingredState.volume
        return {
          ...acc,
          [ingredId]: {
            volume: ingredVolume,
          },
        }
      },
      {}
    ),
  }
}
// TODO: Ian 2019-04-19 move to shared-data helpers?
export function getWellsForTips(
  channels: 1 | 8 | 96,
  labwareDef: LabwareDefinition2,
  well: string
): {
  wellsForTips: string[]
  allWellsShared: boolean
} {
  // Array of wells corresponding to the tip at each position.
  const wellsForTips =
    channels === 1 ? [well] : getWellNamePerMultiTip(labwareDef, well, channels)

  if (!wellsForTips) {
    console.warn(
      channels === 1
        ? `Invalid well: ${well}`
        : `For labware def (URI ${getLabwareDefURI(
            labwareDef
          )}), with primary well ${well}, no wells are accessible by 8-channel's 1st tip`
    )
    // TODO: Ian 2019-04-11 figure out a clearer way to handle failure case
    return {
      wellsForTips: [],
      allWellsShared: false,
    }
  }

  // allWellsShared: eg in a trough, all wells are shared by an 8-channel
  // (for single-channel, "all wells" are always shared because there is only 1 well)
  // NOTE Ian 2018-03-15: there is no support for a case where some but not all wells are shared.
  // Eg, some unusual labware that allows 2 tips to a well will not work with the implementation below.
  // Low-priority TODO.
  const allWellsShared = wellsForTips.every(w => w && w === wellsForTips[0])
  return {
    wellsForTips,
    allWellsShared,
  }
}
// Set blowout location depending on the 'blowoutLocation' arg: set it to
// the SOURCE_WELL_BLOWOUT_DESTINATION / DEST_WELL_BLOWOUT_DESTINATION
// special strings, or to a labware ID.
export const blowoutLocationHelper = (args: {
  pipette: BlowoutParams['pipetteId']
  sourceLabwareId: string
  sourceWell: BlowoutParams['wellName']
  destLabwareId: string
  blowoutLocation: string | null | undefined
  flowRate: number
  offsetFromTopMm: number
  invariantContext: InvariantContext
  destWell: BlowoutParams['wellName'] | null
}): CurriedCommandCreator[] => {
  const {
    pipette,
    sourceLabwareId,
    sourceWell,
    destLabwareId,
    destWell,
    blowoutLocation,
    flowRate,
    offsetFromTopMm,
    invariantContext,
  } = args
  if (!blowoutLocation) return []
  const {
    labwareEntities,
    trashBinEntities,
    wasteChuteEntities,
  } = invariantContext
  const trashOrLabware = getTrashOrLabware(
    labwareEntities,
    wasteChuteEntities,
    trashBinEntities,
    destLabwareId
  )

  let labware: LabwareEntity | null = null
  let well: string | null = null
  if (blowoutLocation === SOURCE_WELL_BLOWOUT_DESTINATION) {
    labware = invariantContext.labwareEntities[sourceLabwareId]
    well = sourceWell
  } else if (blowoutLocation === DEST_WELL_BLOWOUT_DESTINATION) {
    labware =
      trashOrLabware === 'labware'
        ? invariantContext.labwareEntities[destLabwareId]
        : null
    well = trashOrLabware === 'labware' ? destWell : null
  } else {
    // if it's not one of the magic strings, it's a labware or waste chute or trash bin id
    labware = invariantContext.labwareEntities?.[blowoutLocation]
    well = trashOrLabware === 'labware' ? 'A1' : null
  }

  if (well != null && trashOrLabware === 'labware' && labware != null) {
    return [
      curryCommandCreator(blowOutInWell, {
        pipetteId: pipette,
        labwareId: labware.id,
        wellName: well,
        flowRate,
        wellLocation: {
          origin: 'top',
          offset: {
            z: offsetFromTopMm,
          },
        },
      }),
    ]
  } else if (trashOrLabware === 'wasteChute') {
    return [
      curryCommandCreator(blowOutInWasteChute, {
        pipetteId: pipette,
        flowRate,
        wasteChuteId: Object.keys(wasteChuteEntities)[0] as string,
      }),
    ]
  } else {
    return [
      curryCommandCreator(blowOutInTrash, {
        pipetteId: pipette,
        trashId: Object.keys(trashBinEntities)[0] as string,
        flowRate,
      }),
    ]
  }
}
export function createEmptyLiquidState(
  invariantContext: InvariantContext
): RobotState['liquidState'] {
  const {
    labwareEntities,
    pipetteEntities,
    wasteChuteEntities,
    trashBinEntities,
  } = invariantContext
  return {
    pipettes: reduce(
      pipetteEntities,
      (acc, pipette: PipetteEntity, id: string) => {
        const pipetteSpec = pipette.spec
        return { ...acc, [id]: createTipLiquidState(pipetteSpec.channels, {}) }
      },
      {}
    ),
    labware: reduce(
      labwareEntities,
      (acc, labware: LabwareEntity, id: string) => {
        return { ...acc, [id]: mapValues(labware.def.wells, () => ({})) }
      },
      {}
    ),
    trashBins: reduce(
      trashBinEntities,
      (acc, trashBin: TrashBinEntity, id: string) => {
        return { ...acc, [id]: {} }
      },
      {}
    ),
    wasteChute: reduce(
      wasteChuteEntities,
      (acc, wasteChute: WasteChuteEntity, id: string) => {
        return { ...acc, [id]: {} }
      },
      {}
    ),
  }
}
export function createTipLiquidState<T>(
  channels: number,
  contents: T
): Record<string, T> {
  return range(channels).reduce(
    (tipIdAcc, tipId) => ({ ...tipIdAcc, [tipId]: contents }),
    {}
  )
}
// always return destination unless the blowout location is the source
export const getDispenseAirGapLocation = (args: {
  destLabware: string
  destWell: string
  sourceWell?: string
  sourceLabware?: string
  blowoutLocation?: string | null
}): {
  dispenseAirGapLabware: string
  dispenseAirGapWell: string
} => {
  const {
    blowoutLocation,
    sourceLabware,
    destLabware,
    sourceWell,
    destWell,
  } = args
  return blowoutLocation === SOURCE_WELL_BLOWOUT_DESTINATION &&
    //  note: sourceLabware & sourceWell != null for air gap in a transfer only
    //  since transfer allows you to specify the blowout location as source well
    sourceLabware != null &&
    sourceWell != null
    ? {
        dispenseAirGapLabware: sourceLabware,
        dispenseAirGapWell: sourceWell,
      }
    : {
        //  this case is for transfer and consolidate when blowout location is NOT
        //  in a source well
        dispenseAirGapLabware: destLabware,
        dispenseAirGapWell: destWell,
      }
}
// NOTE: pipettes have no tips, tiprack are full
export function makeInitialRobotState(args: {
  invariantContext: InvariantContext
  labwareLocations: RobotState['labware']
  moduleLocations: RobotState['modules']
  pipetteLocations: RobotState['pipettes']
}): RobotState {
  const {
    invariantContext,
    labwareLocations,
    moduleLocations = {},
    pipetteLocations,
  } = args
  return {
    labware: labwareLocations,
    modules: moduleLocations,
    pipettes: pipetteLocations,
    liquidState: createEmptyLiquidState(invariantContext),
    tipState: {
      pipettes: reduce(
        pipetteLocations,
        (acc, pipetteTemporalProperties, id) =>
          pipetteTemporalProperties.mount ? { ...acc, [id]: false } : acc,
        {}
      ),
      tipracks: reduce(
        labwareLocations,
        (acc, _, labwareId) => {
          const def = invariantContext.labwareEntities[labwareId].def
          if (!getIsTiprack(def)) return acc
          const tipState = mapValues(def.wells, () => true)
          return { ...acc, [labwareId]: tipState }
        },
        {}
      ),
    },
  }
}

export const getTiprackHasTips = (
  tipState: RobotState['tipState'],
  labwareId: string
): boolean => {
  return tipState.tipracks[labwareId] != null
    ? Object.values(tipState.tipracks[labwareId]).some(
        tipState => tipState === true
      )
    : false
}

export const getLabwareHasLiquid = (
  liquidState: RobotState['liquidState'],
  labwareId: string
): boolean => {
  return liquidState.labware[labwareId] != null
    ? Object.values(liquidState.labware[labwareId]).some(liquidState =>
        Object.values(liquidState).some(volume => volume.volume > 0)
      )
    : false
}

interface DispenseLocationHelperArgs {
  //  destinationId is either labware or addressableAreaName for waste chute
  destinationId: string
  pipetteId: string
  volume: number
  flowRate: number
  xOffset: number
  yOffset: number
  nozzles: NozzleConfigurationStyle | null
  tipRack: string
  offsetFromBottomMm?: number
  well?: string
}
export const dispenseLocationHelper: CommandCreator<DispenseLocationHelperArgs> = (
  args,
  invariantContext,
  prevRobotState
) => {
  const {
    destinationId,
    pipetteId,
    volume,
    flowRate,
    offsetFromBottomMm,
    well,
    xOffset,
    yOffset,
    tipRack,
    nozzles,
  } = args
  const {
    labwareEntities,
    trashBinEntities,
    wasteChuteEntities,
  } = invariantContext
  const trashOrLabware = getTrashOrLabware(
    labwareEntities,
    wasteChuteEntities,
    trashBinEntities,
    destinationId
  )

  let commands: CurriedCommandCreator[] = []
  if (
    trashOrLabware === 'labware' &&
    offsetFromBottomMm != null &&
    well != null
  ) {
    commands = [
      curryCommandCreator(dispense, {
        pipetteId,
        volume,
        labwareId: destinationId,
        wellName: well,
        flowRate,
        wellLocation: {
          origin: 'bottom',
          offset: {
            z: offsetFromBottomMm,
            x: xOffset,
            y: yOffset,
          },
        },
        tipRack,
        nozzles,
      }),
    ]
  } else if (trashOrLabware === 'wasteChute') {
    commands = [
      curryCommandCreator(dispenseInWasteChute, {
        pipetteId,
        volume,
        flowRate,
        wasteChuteId: wasteChuteEntities[destinationId].id,
      }),
    ]
  } else {
    commands = [
      curryCommandCreator(dispenseInTrash, {
        pipetteId,
        volume,
        flowRate,
        trashId: trashBinEntities[destinationId].id,
      }),
    ]
  }

  return reduceCommandCreators(commands, invariantContext, prevRobotState)
}

interface MoveHelperArgs {
  //  destinationId is either labware or addressableAreaName for waste chute
  destinationId: string
  pipetteId: string
  zOffset: number
  well?: string
}
export const moveHelper: CommandCreator<MoveHelperArgs> = (
  args,
  invariantContext,
  prevRobotState
) => {
  const { destinationId, pipetteId, zOffset, well } = args
  const {
    labwareEntities,
    wasteChuteEntities,
    trashBinEntities,
  } = invariantContext
  const trashOrLabware = getTrashOrLabware(
    labwareEntities,
    wasteChuteEntities,
    trashBinEntities,
    destinationId
  )

  let commands: CurriedCommandCreator[] = []
  if (trashOrLabware === 'labware' && well != null) {
    commands = [
      curryCommandCreator(moveToWell, {
        pipetteId: pipetteId,
        labwareId: destinationId,
        wellName: well,
        wellLocation: {
          origin: 'bottom',
          offset: { x: 0, y: 0, z: zOffset },
        },
      }),
    ]
  } else if (trashOrLabware === 'wasteChute') {
    commands = [
      curryCommandCreator(moveToAddressableArea, {
        pipetteId,
        fixtureId: wasteChuteEntities[destinationId].id,
        offset: { x: 0, y: 0, z: 0 },
      }),
    ]
  } else {
    commands = [
      curryCommandCreator(moveToAddressableArea, {
        pipetteId,
        fixtureId: trashBinEntities[destinationId].id,
        offset: ZERO_OFFSET,
      }),
    ]
  }

  return reduceCommandCreators(commands, invariantContext, prevRobotState)
}

interface AirGapLocationArgs {
  //  destinationId is either labware or addressableAreaName for waste chute
  destinationId: string
  destWell: string | null
  flowRate: number
  pipetteId: string
  volume: number
  blowOutLocation?: string | null
  sourceId?: string
  sourceWell?: string
}
export const airGapLocationHelper: CommandCreator<AirGapLocationArgs> = (
  args,
  invariantContext,
  prevRobotState
) => {
  const {
    blowOutLocation,
    destinationId,
    destWell,
    flowRate,
    pipetteId,
    sourceId,
    sourceWell,
    volume,
  } = args
  const {
    labwareEntities,
    trashBinEntities,
    wasteChuteEntities,
  } = invariantContext
  const trashOrLabware = getTrashOrLabware(
    labwareEntities,
    wasteChuteEntities,
    trashBinEntities,
    destinationId
  )

  let commands: CurriedCommandCreator[] = []
  if (trashOrLabware === 'labware' && destWell != null) {
    const {
      dispenseAirGapLabware,
      dispenseAirGapWell,
    } = getDispenseAirGapLocation({
      blowoutLocation: blowOutLocation,
      sourceLabware: sourceId,
      destLabware: destinationId,
      sourceWell,
      destWell: destWell,
    })
    commands = [
      curryCommandCreator(airGapInWell, {
        flowRate,
        pipetteId,
        labwareId: dispenseAirGapLabware,
        wellName: dispenseAirGapWell,
        volume,
        type: 'dispense',
      }),
    ]
  } else if (trashOrLabware === 'wasteChute') {
    commands = [
      curryCommandCreator(airGapInWasteChute, {
        pipetteId,
        volume,
        flowRate,
        wasteChuteId: wasteChuteEntities[destinationId].id,
      }),
    ]
  } else {
    commands = [
      curryCommandCreator(airGapInTrash, {
        pipetteId,
        volume,
        flowRate,
        trashId: trashBinEntities[destinationId].id,
      }),
    ]
  }

  return reduceCommandCreators(commands, invariantContext, prevRobotState)
}

interface DelayLocationHelperArgs {
  pipetteId: string
  destinationId: string
  well: string | null
  zOffset: number
  seconds: number
}

export const delayLocationHelper: CommandCreator<DelayLocationHelperArgs> = (
  args,
  invariantContext,
  prevRobotState
) => {
  const { pipetteId, destinationId, well, zOffset, seconds } = args
  const {
    labwareEntities,
    trashBinEntities,
    wasteChuteEntities,
  } = invariantContext
  const trashOrLabware = getTrashOrLabware(
    labwareEntities,
    wasteChuteEntities,
    trashBinEntities,
    destinationId
  )

  let commands: CurriedCommandCreator[] = []

  if (well != null && trashOrLabware === 'labware') {
    commands = [
      curryCommandCreator(moveToWell, {
        pipetteId: pipetteId,
        labwareId: destinationId,
        wellName: well,
        wellLocation: {
          origin: 'bottom',
          offset: { x: 0, y: 0, z: zOffset },
        },
      }),
      curryCommandCreator(delay, {
        seconds: seconds,
      }),
    ]
  } else if (trashOrLabware === 'wasteChute') {
    commands = [
      curryCommandCreator(moveToAddressableArea, {
        pipetteId,
        fixtureId: destinationId,
        offset: ZERO_OFFSET,
      }),
      curryCommandCreator(delay, {
        seconds: seconds,
      }),
    ]
  } else {
    commands = [
      curryCommandCreator(moveToAddressableArea, {
        pipetteId,
        fixtureId: destinationId,
        offset: ZERO_OFFSET,
      }),
      curryCommandCreator(delay, {
        seconds: seconds,
      }),
    ]
  }

  return reduceCommandCreators(commands, invariantContext, prevRobotState)
}
