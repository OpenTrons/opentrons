// @flow
import assert from 'assert'
import cloneDeep from 'lodash/cloneDeep'
import flatMap from 'lodash/flatMap'
import mapValues from 'lodash/mapValues'
import range from 'lodash/range'
import reduce from 'lodash/reduce'
import last from 'lodash/last'
import {
  getIsTiprack,
  getLabwareDefURI,
  getWellsDepth,
  getWellNamePerMultiTip,
} from '@opentrons/shared-data'
import { GEN_ONE_MULTI_PIPETTES } from '../constants'

import type { LabwareDefinition2 } from '@opentrons/shared-data'
import type { BlowoutParams } from '@opentrons/shared-data/protocol/flowTypes/schemaV3'
import type { PipetteEntity, LabwareEntity } from '../step-forms'
import type {
  CommandCreator,
  LocationLiquidState,
  InvariantContext,
  RobotState,
  SourceAndDest,
  Timeline,
} from './types'
import blowout from './commandCreators/atomic/blowout'

import { AIR } from '@opentrons/components'
export { AIR }

export const SOURCE_WELL_BLOWOUT_DESTINATION: 'source_well' = 'source_well'
export const DEST_WELL_BLOWOUT_DESTINATION: 'dest_well' = 'dest_well'

export function repeatArray<T>(array: Array<T>, repeats: number): Array<T> {
  return flatMap(range(repeats), (i: number): Array<T> => array)
}

/**
 * Take an array of CommandCreators, streaming robotState through them in order,
 * and adding each CommandCreator's commands to a single commands array.
 */
export const reduceCommandCreators = (
  commandCreators: Array<CommandCreator>
): CommandCreator => (
  invariantContext: InvariantContext,
  prevRobotState: RobotState
) => {
  return commandCreators.reduce(
    (prev: $Call<CommandCreator, *, *>, reducerFn: CommandCreator, stepIdx) => {
      if (prev.errors) {
        // if there are errors, short-circuit the reduce
        return prev
      }
      const next = reducerFn(invariantContext, prev.robotState)
      if (next.errors) {
        return {
          robotState: prev.robotState,
          commands: prev.commands,
          errors: next.errors,
          errorStep: stepIdx,
          warnings: prev.warnings,
        }
      }
      return {
        robotState: next.robotState,
        commands: [...prev.commands, ...next.commands],
        warnings: [...(prev.warnings || []), ...(next.warnings || [])],
      }
    },
    { robotState: cloneDeep(prevRobotState), commands: [] }
    // TODO: should I clone here (for safety) or is it safe enough?
    // Should I avoid cloning in the CommandCreators themselves and just do it pre-emptively in here?
  )
}

export const commandCreatorsTimeline = (
  commandCreators: Array<CommandCreator>
) => (
  invariantContext: InvariantContext,
  initialRobotState: RobotState
): Timeline => {
  const timeline = commandCreators.reduce(
    (acc: Timeline, commandCreator: CommandCreator, index: number) => {
      const prevRobotState =
        acc.timeline.length === 0
          ? initialRobotState
          : last(acc.timeline).robotState

      if (acc.errors) {
        // error short-circuit
        return acc
      }

      const nextResult = commandCreator(invariantContext, prevRobotState)

      if (nextResult.errors) {
        return {
          timeline: acc.timeline,
          errors: nextResult.errors,
        }
      }

      return {
        timeline: [...acc.timeline, nextResult],
        errors: null,
      }
    },
    { timeline: [], errors: null }
  )

  return {
    timeline: timeline.timeline,
    errors: timeline.errors,
  }
}

type Vol = { volume: number }

export function getLocationTotalVolume(loc: LocationLiquidState): number {
  return reduce(
    loc,
    (acc: number, ingredState: Vol, ingredId: string) => {
      // air is not included in the total volume
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
      dest: { [AIR]: { volume } },
    }
  }

  if (volume > totalSourceVolume) {
    // Take all of source, plus air
    return {
      source: mapValues(sourceLiquidState, () => ({ volume: 0 })),
      dest: {
        ...sourceLiquidState,
        [AIR]: { volume: volume - totalSourceVolume },
      },
    }
  }

  const ratios: { [ingredId: string]: number } = reduce(
    sourceLiquidState,
    (
      acc: { [ingredId: string]: number },
      ingredState: Vol,
      ingredId: string
    ) => ({
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
          [ingredId]: { volume: sourceLiquidState[ingredId].volume - destVol },
        },
        dest: {
          ...acc.dest,
          [ingredId]: { volume: destVol },
        },
      }
    },
    { source: {}, dest: {} }
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

    ...reduce(
      source,
      (acc: LocationLiquidState, ingredState: Vol, ingredId: string) => {
        const isCommonIngred = ingredId in dest
        const ingredVolume = isCommonIngred
          ? // sum volumes of ingredients common to 'source' and 'dest'
            ingredState.volume + dest[ingredId].volume
          : // include all ingreds exclusive to 'source'
            ingredState.volume

        return {
          ...acc,
          [ingredId]: { volume: ingredVolume },
        }
      },
      {}
    ),
  }
}

// TODO: Ian 2019-04-19 move to shared-data helpers?
export function getWellsForTips(
  channels: 1 | 8,
  labwareDef: LabwareDefinition2,
  well: string
): {|
  wellsForTips: Array<string>,
  allWellsShared: boolean,
|} {
  // Array of wells corresponding to the tip at each position.
  const wellsForTips =
    channels === 1 ? [well] : getWellNamePerMultiTip(labwareDef, well)

  if (!wellsForTips) {
    console.warn(
      channels === 1
        ? `Invalid well: ${well}`
        : `For labware def (URI ${getLabwareDefURI(
            labwareDef
          )}), with primary well ${well}, no wells are accessible by 8-channel's 1st tip`
    )
    // TODO: Ian 2019-04-11 figure out a clearer way to handle failure case
    return { wellsForTips: [], allWellsShared: false }
  }

  // allWellsShared: eg in a trough, all wells are shared by an 8-channel
  // (for single-channel, "all wells" are always shared because there is only 1 well)
  // NOTE Ian 2018-03-15: there is no support for a case where some but not all wells are shared.
  // Eg, some unusual labware that allows 2 tips to a well will not work with the implementation below.
  // Low-priority TODO.
  const allWellsShared = wellsForTips.every(w => w && w === wellsForTips[0])

  return { wellsForTips, allWellsShared }
}

/** Total volume of a location (air is not included in the sum) */
export function totalVolume(location: LocationLiquidState): number {
  return Object.keys(location).reduce((acc, ingredId) => {
    return ingredId !== AIR ? acc + (location[ingredId].volume || 0) : acc
  }, 0)
}

// Set blowout location depending on the 'blowoutLocation' arg: set it to
// the SOURCE_WELL_BLOWOUT_DESTINATION / DEST_WELL_BLOWOUT_DESTINATION
// special strings, or to a labware ID.
export const blowoutUtil = (args: {
  pipette: $PropertyType<BlowoutParams, 'pipette'>,
  sourceLabwareId: string,
  sourceWell: $PropertyType<BlowoutParams, 'well'>,
  destLabwareId: string,
  destWell: $PropertyType<BlowoutParams, 'well'>,
  blowoutLocation: ?string,
  flowRate: number,
  offsetFromTopMm: number,
  invariantContext: InvariantContext,
}): Array<CommandCreator> => {
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
  let labware
  let well

  if (blowoutLocation === SOURCE_WELL_BLOWOUT_DESTINATION) {
    labware = invariantContext.labwareEntities[sourceLabwareId]
    well = sourceWell
  } else if (blowoutLocation === DEST_WELL_BLOWOUT_DESTINATION) {
    labware = invariantContext.labwareEntities[destLabwareId]
    well = destWell
  } else {
    // if it's not one of the magic strings, it's a labware id
    labware = invariantContext.labwareEntities?.[blowoutLocation]
    well = 'A1'
    if (!labware) {
      assert(
        false,
        `expected a labwareId for blowoutUtil's "blowoutLocation", got ${blowoutLocation}`
      )
      return []
    }
  }
  const offsetFromBottomMm =
    getWellsDepth(labware.def, [well]) + offsetFromTopMm
  return [
    blowout({
      pipette: pipette,
      labware: labware.id,
      well,
      flowRate,
      offsetFromBottomMm,
    }),
  ]
}

export function createEmptyLiquidState(invariantContext: InvariantContext) {
  const { labwareEntities, pipetteEntities } = invariantContext

  return {
    pipettes: reduce(
      pipetteEntities,
      (acc, pipette: PipetteEntity, id: string) => {
        const pipetteSpec = pipette.spec
        return {
          ...acc,
          [id]: createTipLiquidState(pipetteSpec.channels, {}),
        }
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
  }
}

export function createTipLiquidState<T>(
  channels: number,
  contents: T
): { [tipId: string]: T } {
  return range(channels).reduce(
    (tipIdAcc, tipId) => ({
      ...tipIdAcc,
      [tipId]: contents,
    }),
    {}
  )
}

// NOTE: pipettes have no tips, tiprack are full
export function makeInitialRobotState(args: {|
  invariantContext: InvariantContext,
  labwareLocations: $PropertyType<RobotState, 'labware'>,
  moduleLocations: $PropertyType<RobotState, 'modules'>,
  pipetteLocations: $PropertyType<RobotState, 'pipettes'>,
|}): RobotState {
  const {
    invariantContext,
    labwareLocations,
    moduleLocations,
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

// HACK Ian 2019-11-12: this is a temporary solution to pass PD runtime feature flags
// down into step-generation, which is meant to be relatively independent of PD.
// WARNING: Unless you're careful to bust any caches (eg of selectors that use step-generation),
// there could be delayed-sync issues when toggling a flag with this solution, because
// we're directly accessing localStorage without an ability to.
// A long-term solution might be to either restart PD upon setting flags that are used here,
// or pass flags as "config options" into step-generation via a factory that stands in front of all step-generation imports,
// or just avoid this complexity for non-experimental features.
const getFeatureFlag = (flagName: string): boolean => {
  if (!global.localStorage) {
    let value = false
    try {
      value = process.env[flagName] === 'true'
    } catch (e) {
      console.error(
        `appear to be in node environment, but cannot access ${flagName} in process.env. ${e}`
      )
    }
    return value
  }
  const allFlags = JSON.parse(
    global.localStorage.getItem('root.featureFlags.flags') || '{}'
  )
  return (allFlags && allFlags[flagName]) || false
}

export const modulePipetteCollision = (args: {|
  pipette: ?string,
  labware: ?string,
  invariantContext: InvariantContext,
  prevRobotState: RobotState,
|}): boolean => {
  if (getFeatureFlag('OT_PD_DISABLE_MODULE_RESTRICTIONS')) {
    // always ignore collision hazard
    return false
  }
  const { pipette, labware, invariantContext, prevRobotState } = args
  const pipetteEntity: ?* = pipette && invariantContext.pipetteEntities[pipette]
  const labwareSlot: ?* = labware && prevRobotState.labware[labware]?.slot
  if (!pipette || !labware || !pipetteEntity || !labwareSlot) return false

  // NOTE: does not handle thermocycler-adjacent slots.
  // Only handles labware is NORTH of mag/temp in slot 1 or 3
  // Does not care about GEN1/GEN2 module, just GEN1 multi-ch pipette
  const labwareInDangerZone = Object.keys(invariantContext.moduleEntities).some(
    moduleId => {
      const moduleSlot: ?* = prevRobotState.modules[moduleId]?.slot
      const moduleType: ?* = invariantContext.moduleEntities[moduleId]?.type
      const hasNorthSouthProblem = ['tempdeck', 'magdeck'].includes(moduleType)
      const labwareInNorthSlot =
        (moduleSlot === '1' && labwareSlot === '4') ||
        (moduleSlot === '3' && labwareSlot === '6')
      return hasNorthSouthProblem && labwareInNorthSlot
    }
  )

  return (
    GEN_ONE_MULTI_PIPETTES.includes(pipetteEntity.name) && labwareInDangerZone
  )
}
