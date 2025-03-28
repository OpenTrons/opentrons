import type { CreateCommand } from '@opentrons/shared-data'
import type { CommandData } from '@opentrons/api-client'
import type { UseLPCCommandsProps } from '.'

export interface UseLPCCommandChildProps extends UseLPCCommandsProps {}

export interface UseLPCCommandWithChainRunChildProps
  extends UseLPCCommandChildProps {
  chainLPCCommands: (
    commands: CreateCommand[],
    continuePastCommandFailure: boolean,
    shouldPropogateError?: boolean
  ) => Promise<CommandData[]>
}
