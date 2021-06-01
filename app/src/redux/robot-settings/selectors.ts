// @flow
import type { State } from '../types'
import type { RobotSettings } from './types'

const robotState = (state: State, name: string | null) =>
  name != null ? state.robotSettings[name] : null

export function getRobotSettings(
  state: State,
  robotName: string | null
): RobotSettings {
  return robotState(state, robotName)?.settings || []
}

export function getRobotRestartPath(
  state: State,
  robotName: string | null
): string | null {
  return robotState(state, robotName)?.restartPath || null
}

export function getRobotRestartRequired(
  state: State,
  robotName: string | null
): boolean {
  return getRobotRestartPath(state, robotName) !== null
}

export function getAllRestartRequiredRobots(state: State): Array<string> {
  return Object.keys(state.robotSettings).filter((name: string) => {
    return getRobotRestartRequired(state, name)
  })
}
