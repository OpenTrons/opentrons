import { uuid, formatPyStr, PROTOCOL_CONTEXT_NAME } from '../../utils'
import type { CommentParams } from '@opentrons/shared-data'
import type { CommandCreator } from '../../types'

export const comment: CommandCreator<CommentParams> = (
  args,
  invariantContext,
  prevRobotState
) => {
  const { message } = args

  const commands = [
    {
      commandType: 'comment' as const,
      key: uuid(),
      params: {
        message,
      },
    },
  ]
  const python = `${PROTOCOL_CONTEXT_NAME}.comment(${formatPyStr(message)})`
  return {
    commands,
    python,
  }
}
