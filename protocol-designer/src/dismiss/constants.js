// @flow
export const PRESAVED_STEP_FORM_PSUDO_ID = '__PRESAVED_FORM_DISMISS__'

export const getStepIdOrPseudoId = (stepId: ?string): string =>
  stepId || PRESAVED_STEP_FORM_PSUDO_ID
