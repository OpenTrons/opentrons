import type { NormalizedPipetteById } from '@opentrons/step-generation'
import type { StepIdType } from '/protocol-designer/form-types'
export interface CreatePipettesAction {
  type: 'CREATE_PIPETTES'
  payload: NormalizedPipetteById
}
export const createPipettes = (
  payload: CreatePipettesAction['payload']
): CreatePipettesAction => {
  return {
    type: 'CREATE_PIPETTES',
    payload,
  }
}
export interface DeletePipettesAction {
  type: 'DELETE_PIPETTES'
  payload: string[] // pipette ids to delete, order doesn't matter
}
export const deletePipettes = (
  payload: DeletePipettesAction['payload']
): DeletePipettesAction => ({
  type: 'DELETE_PIPETTES',
  payload,
})
export interface SubstituteStepFormPipettesAction {
  type: 'SUBSTITUTE_STEP_FORM_PIPETTES'
  payload: {
    // step range to modify (inclusive)
    startStepId: StepIdType
    endStepId: StepIdType
    // old pipette id -> new id
    substitutionMap: Record<string, string>
  }
}
export const substituteStepFormPipettes = (
  payload: SubstituteStepFormPipettesAction['payload']
): SubstituteStepFormPipettesAction => ({
  type: 'SUBSTITUTE_STEP_FORM_PIPETTES',
  payload,
})
