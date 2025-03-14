import { uuid } from '../../utils'
import type { CommandCreator } from '../../types'
import type { PrepareToAspirateParams } from '@opentrons/shared-data'

export const prepareToAspirate: CommandCreator<PrepareToAspirateParams> = args => {
  const { pipetteId } = args

  const commands = [
    {
      commandType: 'prepareToAspirate' as const,
      key: uuid(),
      params: {
        pipetteId,
      },
    },
  ]
  return {
    commands,
  }
}
