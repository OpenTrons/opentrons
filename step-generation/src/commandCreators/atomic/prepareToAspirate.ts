import { uuid } from '../../utils'
import type { CommandCreator } from '../../types'
import type { PrepareToAspirateParams } from '@opentrons/shared-data'

export const prepareToAspirate: CommandCreator<PrepareToAspirateParams> = (
  args,
  invariantContext,
  prevRobotState
) => {
  const { pipetteId } = args
  const pipettePythonName =
    invariantContext.pipetteEntities[pipetteId].pythonName

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
    python: `${pipettePythonName}.prepare_to_aspirate()`,
  }
}
