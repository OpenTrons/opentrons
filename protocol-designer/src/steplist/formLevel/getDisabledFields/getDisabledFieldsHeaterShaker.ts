import type { HydratedHeaterShakerFormData } from '/protocol-designer/form-types'

export function getDisabledFieldsHeaterShaker(
  hydratedForm: HydratedHeaterShakerFormData
): Set<string> {
  const disabled: Set<string> = new Set()

  if (hydratedForm.setShake === true) {
    disabled.add('latchOpen')
  }

  return disabled
}
