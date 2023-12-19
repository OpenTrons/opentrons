import * as React from 'react'
import { useSelector } from 'react-redux'
import { FormGroup } from '@opentrons/components'
import { i18n } from '../../../../localization'
import { getAdditionalEquipmentEntities } from '../../../../step-forms/selectors'
import { StepFieldName } from '../../../../steplist/fieldLevel'
import { LabwareField, WellSelectionField } from '../../fields'
import { AspDispSection } from '../AspDispSection'
import type { FormData } from '../../../../form-types'
import type { FieldPropsByName } from '../../types'

import styles from '../../StepEditForm.css'

interface Props {
  className?: string | null
  collapsed?: boolean | null
  formData: FormData
  prefix: 'aspirate' | 'dispense'
  propsForFields: FieldPropsByName
  toggleCollapsed: () => void
}

const makeAddFieldNamePrefix = (prefix: string) => (
  fieldName: string
): StepFieldName => `${prefix}_${fieldName}`

export const SourceDestHeaders = (props: Props): JSX.Element => {
  const {
    className,
    collapsed,
    toggleCollapsed,
    prefix,
    propsForFields,
    formData,
  } = props
  const addFieldNamePrefix = makeAddFieldNamePrefix(prefix)
  const additionalEquipmentEntities = useSelector(
    getAdditionalEquipmentEntities
  )
  const labwareLabel = i18n.t(`form.step_edit_form.labwareLabel.${prefix}`)
  const trashOrLabwareId = formData[addFieldNamePrefix('labware')]
  const isDisposalLocation =
    additionalEquipmentEntities[trashOrLabwareId]?.name === 'wasteChute' ||
    additionalEquipmentEntities[trashOrLabwareId]?.name === 'trashBin'

  return (
    <AspDispSection {...{ className, collapsed, toggleCollapsed, prefix }}>
      <div className={styles.form_row}>
        <FormGroup label={labwareLabel}>
          <LabwareField {...propsForFields[addFieldNamePrefix('labware')]} />
        </FormGroup>
        {isDisposalLocation ? null : (
          <WellSelectionField
            {...propsForFields[addFieldNamePrefix('wells')]}
            labwareId={trashOrLabwareId}
            pipetteId={formData.pipette}
            nozzles={String(propsForFields.nozzles.value) ?? null}
          />
        )}
      </div>
    </AspDispSection>
  )
}
