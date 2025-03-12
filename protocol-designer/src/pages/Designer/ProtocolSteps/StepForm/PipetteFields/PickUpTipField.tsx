import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import { getAllTiprackOptions } from '../../../../../ui/labware/selectors'
import { DropdownStepFormField } from '../../../../../molecules'
import type { DropdownOption } from '@opentrons/components'
import type { FieldProps } from '../types'

export function PickUpTipField(props: FieldProps): JSX.Element {
  const { value: dropdownItem } = props
  const { t } = useTranslation('protocol_steps')
  const tiprackOptions = useSelector(getAllTiprackOptions)
  const defaultOption: DropdownOption = {
    name: t('default_tip_option'),
    value: '',
  }

  return (
    <DropdownStepFormField
      {...props}
      options={[defaultOption, ...tiprackOptions]}
      value={dropdownItem ? String(dropdownItem) : null}
      title={t('select_tip_location')}
    />
  )
}
