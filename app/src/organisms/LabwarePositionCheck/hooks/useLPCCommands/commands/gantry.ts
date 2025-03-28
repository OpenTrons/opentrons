import type { CreateCommand } from '@opentrons/shared-data'

export const fullHomeCommands = (): CreateCommand[] => [
  { commandType: 'home' as const, params: {} },
]
