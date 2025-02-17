import { useTranslation } from 'react-i18next'
import { InputStepFormField } from '/protocol-designer/molecules'

import type { FieldProps } from '../types'

export function VolumeField(props: FieldProps): JSX.Element {
  const { t } = useTranslation(['protocol_steps', 'application'])

  return (
    <InputStepFormField
      title={t('volume_per_well')}
      units={t('application:units.microliter')}
      showTooltip={false}
      {...props}
    />
  )
}
