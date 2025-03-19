import { formatPyStr, PROTOCOL_CONTEXT_NAME, uuid } from '../../utils'
import type {
  WaitForDurationCreateCommand,
  WaitForDurationParams,
  WaitForResumeCreateCommand,
  WaitForResumeParams,
} from '@opentrons/shared-data'
import type { CommandCreator } from '../../types'

export const delay: CommandCreator<
  WaitForResumeParams | WaitForDurationParams
> = (args, invariantContext, prevRobotState) => {
  const { message } = args
  //  delay is deprecated and now is either waitForResume or waitForDuration
  let command: WaitForResumeCreateCommand | WaitForDurationCreateCommand
  let python: string
  if ('seconds' in args) {
    command = {
      commandType: 'waitForDuration',
      key: uuid(),
      params: { seconds: args.seconds, message },
    }
    const pythonArgs = [
      `seconds=${args.seconds}`,
      ...(message ? [`msg=${formatPyStr(message)}`] : []),
    ]
    python = `${PROTOCOL_CONTEXT_NAME}.delay(${pythonArgs.join(', ')})`
  } else {
    command = {
      commandType: 'waitForResume',
      key: uuid(),
      params: { message },
    }
    python = `${PROTOCOL_CONTEXT_NAME}.pause(${
      message ? formatPyStr(message) : ''
    })`
  }
  return {
    commands: [command],
    python: python,
  }
}
