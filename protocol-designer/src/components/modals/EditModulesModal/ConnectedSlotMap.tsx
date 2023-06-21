import * as React from 'react'
import { useField } from 'formik'
import { SlotMap } from '@opentrons/components'
import styles from './EditModules.css'

interface ConnectedSlotMapProps {
  fieldName: string
  isOt3: boolean
}

export const ConnectedSlotMap = (
  props: ConnectedSlotMapProps
): JSX.Element | null => {
  const { fieldName, isOt3 } = props
  const [field, meta] = useField(fieldName)
  return field.value ? (
    <div className={styles.slot_map_container}>
      <SlotMap
        occupiedSlots={[`${field.value}`]}
        isError={Boolean(meta.error)}
        isOt3={isOt3}
      />
    </div>
  ) : null
}
