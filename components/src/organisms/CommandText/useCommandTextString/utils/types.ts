import type {
  LoadedLabware,
  LoadedModule,
  LoadedPipette,
  RunTimeCommand,
} from '@opentrons/shared-data'
import type { GetCommandText, UseCommandTextStringParams } from '..'

export type HandlesCommands<T extends RunTimeCommand> = Omit<
  GetCommandText,
  'command'
> &
  UseCommandTextStringParams & { command: T }

export type LoadedPipettes = LoadedPipette[] | Record<string, LoadedPipette>

export type LoadedLabwares = LoadedLabware[] | Record<string, LoadedLabware>

export type LoadedModules = LoadedModule[] | Record<string, LoadedModule>
