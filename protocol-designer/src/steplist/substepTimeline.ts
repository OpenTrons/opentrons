import last from 'lodash/last'
import pick from 'lodash/pick'
import {
  getWellsForTips,
  getNextRobotStateAndWarningsSingleCommand,
} from '@opentrons/step-generation'
import { Channels } from '@opentrons/components'
import type {
  CommandCreatorError,
  CommandsAndWarnings,
  CurriedCommandCreator,
  InvariantContext,
  RobotState,
} from '@opentrons/step-generation'
import type { CreateCommand } from '@opentrons/shared-data'
import type { SubstepTimelineFrame, SourceDestData, TipLocation } from './types'

/** Return last picked up tip in the specified commands, if any */
export function _getNewActiveTips(
  commands: CreateCommand[]
): TipLocation | null | undefined {
  const lastNewTipCommand: CreateCommand | null | undefined = last(
    commands.filter(c => c.commandType === 'pickUpTip')
  )
  const newTipParams =
    (lastNewTipCommand != null &&
      lastNewTipCommand.commandType === 'pickUpTip' &&
      lastNewTipCommand.params) ||
    null
  return newTipParams
}

const _createNextTimelineFrame = (args: {
  command: CreateCommand
  index: number
  nextFrame: CommandsAndWarnings
  volume: number
  wellInfo: SourceDestData
}): Partial<{
  command: CreateCommand
  index: number
  nextFrame: CommandsAndWarnings
  volume: number
  wellInfo: SourceDestData
}> => {
  // TODO(IL, 2020-02-24): is there a cleaner way to create newTimelineFrame
  // and keep TS happy about computed properties?
  const _newTimelineFrameKeys = {
    volume: args.volume,
    activeTips: _getNewActiveTips(args.nextFrame.commands.slice(0, args.index)),
  }
  const newTimelineFrame =
    args.command.commandType === 'aspirate'
      ? { ..._newTimelineFrameKeys, source: args.wellInfo }
      : { ..._newTimelineFrameKeys, dest: args.wellInfo }
  return newTimelineFrame
}

const wasteChuteWell = 'A1'

interface SubstepTimelineAcc {
  timeline: SubstepTimelineFrame[]
  errors: CommandCreatorError[] | null | undefined
  prevRobotState: RobotState
}
export const substepTimelineSingleChannel = (
  commandCreator: CurriedCommandCreator,
  invariantContext: InvariantContext,
  initialRobotState: RobotState
): SubstepTimelineFrame[] => {
  const nextFrame = commandCreator(invariantContext, initialRobotState)
  // @ts-expect-error(sa, 2021-6-14): type narrow using in operator
  if (nextFrame.errors) return []
  // @ts-expect-error(sa, 2021-6-14): after type narrowing this expect error should not be necessary
  const timeline = nextFrame.commands.reduce<SubstepTimelineAcc>(
    (acc: SubstepTimelineAcc, command: CreateCommand, index: number) => {
      const nextRobotState = getNextRobotStateAndWarningsSingleCommand(
        command,
        invariantContext,
        acc.prevRobotState
      ).robotState

      if (
        command.commandType === 'aspirate' ||
        command.commandType === 'dispense'
      ) {
        const { wellName, volume, labwareId } = command.params

        let preIngreds = {}
        if (acc.prevRobotState.liquidState.labware[labwareId] != null) {
          preIngreds =
            acc.prevRobotState.liquidState.labware[labwareId][wellName]
        } else if (
          acc.prevRobotState.liquidState.additionalEquipment[labwareId] != null
        ) {
          preIngreds =
            acc.prevRobotState.liquidState.additionalEquipment[labwareId][
              wasteChuteWell
            ]
        }

        let postIngreds = {}
        if (nextRobotState.liquidState.labware[labwareId] != null) {
          postIngreds = nextRobotState.liquidState.labware[labwareId][wellName]
        } else if (
          nextRobotState.liquidState.additionalEquipment[labwareId] != null
        ) {
          postIngreds =
            nextRobotState.liquidState.additionalEquipment[labwareId][
              wasteChuteWell
            ]
        }

        const wellInfo = {
          labwareId,
          wells: [wellName] ?? [wasteChuteWell],
          preIngreds: preIngreds,
          postIngreds: postIngreds,
        }
        return {
          ...acc,
          timeline: [
            ...acc.timeline,
            _createNextTimelineFrame({
              volume,
              index,
              // @ts-expect-error(sa, 2021-6-14): after type narrowing (see comment above) this expect error should not be necessary
              nextFrame,
              command,
              wellInfo,
            }),
          ],
          prevRobotState: nextRobotState,
        }
      } else {
        return { ...acc, prevRobotState: nextRobotState }
      }
    },
    {
      timeline: [],
      errors: null,
      prevRobotState: initialRobotState,
    }
  )
  return timeline.timeline
}
// timeline for multi-channel substep context
export const substepTimelineMultiChannel = (
  commandCreator: CurriedCommandCreator,
  invariantContext: InvariantContext,
  initialRobotState: RobotState,
  channels: Channels
): SubstepTimelineFrame[] => {
  const nextFrame = commandCreator(invariantContext, initialRobotState)
  // @ts-expect-error(sa, 2021-6-14): type narrow using in operator
  if (nextFrame.errors) return []
  // @ts-expect-error(sa, 2021-6-14): after type narrowing this expect error should not be necessary
  const timeline = nextFrame.commands.reduce<SubstepTimelineAcc>(
    (acc: SubstepTimelineAcc, command: CreateCommand, index: number) => {
      const nextRobotState = getNextRobotStateAndWarningsSingleCommand(
        command,
        invariantContext,
        acc.prevRobotState
      ).robotState

      if (
        command.commandType === 'aspirate' ||
        command.commandType === 'dispense'
      ) {
        const { wellName, volume, labwareId } = command.params
        const labwareDef =
          invariantContext.labwareEntities[labwareId] != null
            ? invariantContext.labwareEntities[labwareId].def
            : null

        const wellsForTips =
          channels &&
          labwareDef &&
          getWellsForTips(channels, labwareDef, wellName).wellsForTips

        let preIngreds = {}
        let wells: string[] | null = null

        if (acc.prevRobotState.liquidState.labware[labwareId] != null) {
          preIngreds =
            acc.prevRobotState.liquidState.labware[labwareId][wellName]
          wells = wellsForTips
        } else if (
          acc.prevRobotState.liquidState.additionalEquipment[labwareId] != null
        ) {
          preIngreds =
            acc.prevRobotState.liquidState.additionalEquipment[labwareId][
              wasteChuteWell
            ]
          wells = [wasteChuteWell]
        }

        let postIngreds = {}
        if (nextRobotState.liquidState.labware[labwareId] != null) {
          postIngreds = nextRobotState.liquidState.labware[labwareId][wellName]
        } else if (
          nextRobotState.liquidState.additionalEquipment[labwareId] != null
        ) {
          postIngreds =
            nextRobotState.liquidState.additionalEquipment[labwareId][
              wasteChuteWell
            ]
        }

        const wellInfo = {
          labwareId,
          wells: wells ?? [],
          preIngreds: wells ? pick(preIngreds, wells) : {},
          postIngreds: wells ? pick(postIngreds, wells) : {},
        }
        return {
          ...acc,
          timeline: [
            ...acc.timeline,
            _createNextTimelineFrame({
              volume,
              index,
              // @ts-expect-error(sa, 2021-6-14): after type narrowing (see comment above) this expect error should not be necessary
              nextFrame,
              command,
              wellInfo,
            }),
          ],
          prevRobotState: nextRobotState,
        }
      } else {
        return { ...acc, prevRobotState: nextRobotState }
      }
    },
    {
      timeline: [],
      errors: null,
      prevRobotState: initialRobotState,
    }
  )
  return timeline.timeline
}
export const substepTimeline = (
  commandCreator: CurriedCommandCreator,
  invariantContext: InvariantContext,
  initialRobotState: RobotState,
  channels: Channels
): SubstepTimelineFrame[] => {
  if (channels === 1) {
    return substepTimelineSingleChannel(
      commandCreator,
      invariantContext,
      initialRobotState
    )
  } else {
    return substepTimelineMultiChannel(
      commandCreator,
      invariantContext,
      initialRobotState,
      channels
    )
  }
}
