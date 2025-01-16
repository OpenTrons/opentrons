import { getModuleDef2 } from '@opentrons/shared-data'

import { getNextRobotStateAndWarnings } from '../getNextRobotStateAndWarnings'
import { MODULE_INITIAL_STATE_BY_TYPE } from '../constants'
import { makeInitialRobotState } from './misc'

import type { RunTimeCommand } from '@opentrons/shared-data'
import type {
  InvariantContext,
  RobotState,
  RobotStateAndWarnings,
  TimelineFrame,
} from '../types'

export type RunCommandTimelineFrame = RobotStateAndWarnings & {
  command: RunTimeCommand
}

interface ResultingTimelineFrame {
  frame: RunCommandTimelineFrame
  invariantContext: InvariantContext
}
export function getResultingTimelineFrameFromRunCommands(
  commands: RunTimeCommand[],
  invariantContext: InvariantContext,
  pdInitialRobotState?: TimelineFrame
): ResultingTimelineFrame {
  const pipetteLocations = commands.reduce<RobotState['pipettes']>(
    (acc, command) => {
      if (command.commandType === 'loadPipette') {
        return {
          ...acc,
          [command.params.pipetteId]: {
            mount: command.params.mount,
          },
        }
      }
      return acc
    },
    {}
  )

  const labwareLocations = commands.reduce<RobotState['labware']>(
    (acc, command) => {
      if (command.commandType === 'loadLabware') {
        let slot
        if (command.params.location === 'offDeck') {
          slot = command.params.location
        } else if ('slotName' in command.params.location) {
          slot = command.params.location.slotName
        } else if ('moduleId' in command.params.location) {
          slot = command.params.location.moduleId
        } else if ('labwareId' in command.params.location) {
          slot = command.params.location.labwareId
        } else {
          slot = command.params.location.addressableAreaName
        }
        return {
          ...acc,
          [command.result?.labwareId ?? command.params.labwareId ?? 'test']: {
            slot: slot,
          },
        }
      }
      return acc
    },
    {}
  )
  const moduleLocations = commands.reduce<RobotState['modules']>(
    (acc, command) => {
      if (command.commandType === 'loadModule') {
        const moduleType = getModuleDef2(command.params.model).moduleType
        return {
          ...acc,
          [command.result?.moduleId ?? command.params.moduleId ?? 'test']: {
            slot: command.params.location.slotName,
            moduleState: MODULE_INITIAL_STATE_BY_TYPE[moduleType],
          },
        }
      }
      return acc
    },
    {}
  )
  const initialRobotState = makeInitialRobotState({
    invariantContext,
    labwareLocations,
    moduleLocations,
    pipetteLocations,
  })
  return {
    frame: {
      ...getNextRobotStateAndWarnings(
        commands,
        invariantContext,
        pdInitialRobotState ?? initialRobotState
      ),
      command: commands[commands.length - 1],
    },
    invariantContext,
  }
}
