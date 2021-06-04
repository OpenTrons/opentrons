import * as React from 'react'
import { useFormikContext } from 'formik'
import { isEveryFieldHidden } from '../../utils'
import { makeMaskToDecimal } from '../../fieldMasks'
import { LabwareFields } from '../../fields'
import { FormAlerts } from '../alerts/FormAlerts'
import { TextField } from '../TextField'
import { SectionBody } from './SectionBody'

import styles from '../../styles.css'

const maskTo2Decimal = makeMaskToDecimal(2)

interface ContentProps {
  values: LabwareFields
}
const Content = (props: ContentProps): JSX.Element => {
  const { values } = props
  const wellLabel =
    values.labwareType != null &&
    ['aluminumBlock', 'tubeRack'].includes(values.labwareType)
      ? 'tube'
      : 'well'
  return (
    <div className={styles.flex_row}>
      <div className={styles.volume_instructions_column}>
        <p>Total maximum volume of each {wellLabel}.</p>
      </div>

      <div className={styles.form_fields_column}>
        <TextField name="wellVolume" inputMasks={[maskTo2Decimal]} units="μL" />
      </div>
    </div>
  )
}

export const Volume = (): JSX.Element | null => {
  const fieldList: Array<keyof LabwareFields> = ['wellVolume']
  const { values, errors, touched } = useFormikContext<LabwareFields>()

  if (isEveryFieldHidden(fieldList, values)) {
    return null
  }

  return (
    <div className={styles.new_definition_section}>
      <SectionBody label="Volume" id="Volume">
        <>
          <FormAlerts touched={touched} errors={errors} fieldList={fieldList} />
          <Content values={values} />
        </>
      </SectionBody>
    </div>
  )
}
