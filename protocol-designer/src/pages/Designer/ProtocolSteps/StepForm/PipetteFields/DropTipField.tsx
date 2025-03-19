import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import {
  getAdditionalEquipmentEntities,
  getLabwareEntities,
} from '../../../../../step-forms/selectors'
import { getAllTiprackOptions } from '../../../../../ui/labware/selectors'
import { getEnableReturnTip } from '../../../../../feature-flags/selectors'
import { DropdownStepFormField } from '../../../../../components/molecules'
import type { DropdownOption } from '@opentrons/components'
import type { FieldProps } from '../types'

export function DropTipField(props: FieldProps): JSX.Element {
  const { value: dropdownItem, updateValue } = props
  const { t, i18n } = useTranslation(['form', 'shared'])
  const additionalEquipment = useSelector(getAdditionalEquipmentEntities)
  const labwareEntities = useSelector(getLabwareEntities)
  const tiprackOptions = useSelector(getAllTiprackOptions)
  const enableReturnTip = useSelector(getEnableReturnTip)

  const wasteChute = Object.values(additionalEquipment).find(
    aE => aE.name === 'wasteChute'
  )
  const trashBin = Object.values(additionalEquipment).find(
    aE => aE.name === 'trashBin'
  )
  const wasteChuteOption: DropdownOption = {
    name: t('shared:wasteChute'),
    value: wasteChute?.id ?? '',
  }
  const trashOption: DropdownOption = {
    name: t('shared:trashBin'),
    value: trashBin?.id ?? '',
  }

  const options: DropdownOption[] = []
  if (wasteChute != null) options.push(wasteChuteOption)
  if (trashBin != null) options.push(trashOption)

  useEffect(() => {
    if (
      additionalEquipment[String(dropdownItem)] == null &&
      labwareEntities[String(dropdownItem)] == null
    ) {
      updateValue(null)
    }
  }, [dropdownItem])

  return (
    <DropdownStepFormField
      {...props}
      updateValue={updateValue}
      options={enableReturnTip ? [...options, ...tiprackOptions] : options}
      value={dropdownItem ? String(dropdownItem) : null}
      title={i18n.format(
        t('step_edit_form.field.location.dropTip'),
        'capitalize'
      )}
    />
  )
}
