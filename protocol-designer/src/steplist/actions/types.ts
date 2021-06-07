import type { StepFieldName } from '../fieldLevel'
export type FormPatch = Partial<
  Record<StepFieldName, unknown | null | undefined>
>
// Update Form input (onChange on inputs)
export type ChangeFormPayload = {
  stepId?: string
  // stepId is required for saved step forms, ignored for unsaved form
  update: FormPatch
}
