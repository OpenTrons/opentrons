import * as errorCreators from '../../errorCreators'
import { getIsTallLabwareEastWestOfHeaterShaker, uuid } from '../../utils'
import type { ModuleOnlyParams } from '@opentrons/shared-data'
import type { CommandCreator } from '../../types'

const LEFT_SLOTS = ['1', '4', '7', '10']
export const heaterShakerOpenLatch: CommandCreator<ModuleOnlyParams> = (
  args,
  invariantContext,
  prevRobotState
) => {
  const { pipetteEntities, labwareEntities, moduleEntities } = invariantContext
  const heaterShakerSlot = prevRobotState.modules[args.moduleId].slot
  const firstPipetteId = Object.keys(pipetteEntities)[0]
  const firstPipetteSpec = pipetteEntities[firstPipetteId]?.spec

  const isFlexPipette =
    (firstPipetteSpec?.displayCategory === 'FLEX' ||
      firstPipetteSpec?.channels === 96) ??
    false

  if (
    !isFlexPipette &&
    getIsTallLabwareEastWestOfHeaterShaker(
      prevRobotState.labware,
      labwareEntities,
      heaterShakerSlot
    )
  ) {
    // if H-S is in a left slot, labware must be to the right
    const leftOrRight = LEFT_SLOTS.includes(heaterShakerSlot) ? 'right' : 'left'
    return {
      errors: [errorCreators.tallLabwareEastWestOfHeaterShaker(leftOrRight)],
    }
  }
  const pythonName = moduleEntities[args.moduleId].pythonName

  return {
    commands: [
      {
        commandType: 'heaterShaker/openLabwareLatch',
        key: uuid(),
        params: {
          moduleId: args.moduleId,
        },
      },
    ],
    python: `${pythonName}.open_labware_latch()`,
  }
}
