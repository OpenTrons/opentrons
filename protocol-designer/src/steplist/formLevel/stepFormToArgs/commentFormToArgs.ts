import type { CommentArgs } from '@opentrons/step-generation'
import type { HydratedCommentFormData } from '../../../form-types'

export const commentFormToArgs = (
  hydratedFormData: HydratedCommentFormData
): CommentArgs => {
  const { message, stepName, stepDetails } = hydratedFormData

  return {
    commandCreatorFnName: 'comment',
    description: stepDetails,
    name: stepName,
    message,
  }
}
