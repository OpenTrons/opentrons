import { getNextTiprack } from '../../robotStateSelectors'
import * as errorCreators from '../../errorCreators'
import { dropTip } from './dropTip'
import {
  curryCommandCreator,
  reduceCommandCreators,
  modulePipetteCollision,
  uuid,
} from '../../utils'
import type { CurriedCommandCreator, CommandCreator } from '../../types'
interface PickUpTipArgs {
  pipette: string
  tiprack: string
  well: string
}

const _pickUpTip: CommandCreator<PickUpTipArgs> = (
  args,
  invariantContext,
  prevRobotState
) => {
  return {
    commands: [
      {
        commandType: 'pickUpTip',
        key: uuid(),
        params: {
          pipetteId: args.pipette,
          labwareId: args.tiprack,
          wellName: args.well,
        },
      },
    ],
  }
}

interface ReplaceTipArgs {
  pipette: string
}

/**
  Pick up next available tip. Works differently for an 8-channel which needs a full row of tips.
  Expects 96-well format tip naming system on the tiprack.
  If there's already a tip on the pipette, this will drop it before getting a new one
*/
export const replaceTip: CommandCreator<ReplaceTipArgs> = (
  args,
  invariantContext,
  prevRobotState
) => {
  const { pipette } = args
  const nextTiprack = getNextTiprack(pipette, invariantContext, prevRobotState)

  if (nextTiprack == null) {
    // no valid next tip / tiprack, bail out
    return {
      errors: [errorCreators.insufficientTips()],
    }
  } else if (
    modulePipetteCollision({
      pipette,
      labware: nextTiprack.tiprackId,
      invariantContext,
      prevRobotState,
    })
  ) {
    return {
      errors: [errorCreators.modulePipetteCollisionDanger()],
    }
  }

  const commandCreators: CurriedCommandCreator[] = [
    curryCommandCreator(dropTip, {
      pipette,
    }),
    curryCommandCreator(_pickUpTip, {
      pipette,
      tiprack: nextTiprack.tiprackId,
      well: nextTiprack.well,
    }),
  ]
  const pipetteSpec = invariantContext.pipetteEntities[pipette]?.spec
  if (!pipetteSpec)
    return {
      errors: [
        errorCreators.pipetteDoesNotExist({
          actionName: 'replaceTip',
          pipette,
        }),
      ],
    }
  const labwareDef =
    invariantContext.labwareEntities[nextTiprack.tiprackId]?.def

  if (!labwareDef) {
    return {
      errors: [
        errorCreators.labwareDoesNotExist({
          actionName: 'replaceTip',
          labware: nextTiprack.tiprackId,
        }),
      ],
    }
  }

  return reduceCommandCreators(
    commandCreators,
    invariantContext,
    prevRobotState
  )
}
