import * as React from 'react'
import {
  MAGNETIC_BLOCK_TYPE,
  THERMOCYCLER_MODULE_TYPE,
} from '@opentrons/shared-data'
import wasteChuteImage from '../../assets/images/waste_chute.png'
import trashBinImage from '../../assets/images/flex_trash_bin.png'
import stagingAreaImage from '../../assets/images/staging_area.png'

import type { AdditionalEquipment, WizardFormState } from './types'

const TOTAL_MODULE_SLOTS = 8
const MIDDLE_SLOT_NUM = 4

export const getNumSlotsAvailable = (
  modules: WizardFormState['modules'],
  additionalEquipment: WizardFormState['additionalEquipment'],
  //  special-casing the wasteChute available slots when there is a staging area in slot 3
  isWasteChute?: boolean
): number => {
  const additionalEquipmentLength = additionalEquipment.length
  const hasTC = Object.values(modules || {}).some(
    module => module.type === THERMOCYCLER_MODULE_TYPE
  )
  const magneticBlocks = Object.values(modules || {}).filter(
    module => module.type === MAGNETIC_BLOCK_TYPE
  )
  let filteredModuleLength = modules != null ? Object.keys(modules).length : 0
  if (hasTC) {
    filteredModuleLength = filteredModuleLength + 1
  }
  if (magneticBlocks.length > 0) {
    //  once blocks exceed 4, then we dont' want to subtract the amount available
    //  because block can go into the center slots where all other modules/trashes can not
    const numBlocks =
      magneticBlocks.length > 4 ? MIDDLE_SLOT_NUM : magneticBlocks.length
    filteredModuleLength = filteredModuleLength - numBlocks
  }

  const hasWasteChute = additionalEquipment.some(equipment =>
    equipment.includes('wasteChute')
  )
  const isStagingAreaInD3 = additionalEquipment
    .filter(equipment => equipment.includes('stagingArea'))
    .find(stagingArea => stagingArea.split('_')[1] === 'cutoutD3')
  const hasGripper = additionalEquipment.some(equipment =>
    equipment.includes('gripper')
  )

  let filteredAdditionalEquipmentLength = additionalEquipmentLength
  if (hasWasteChute && isStagingAreaInD3) {
    filteredAdditionalEquipmentLength = filteredAdditionalEquipmentLength - 1
  }
  if (isWasteChute && isStagingAreaInD3) {
    filteredAdditionalEquipmentLength = filteredAdditionalEquipmentLength - 1
  }
  if (hasGripper) {
    filteredAdditionalEquipmentLength = filteredAdditionalEquipmentLength - 1
  }
  return (
    TOTAL_MODULE_SLOTS -
    (filteredModuleLength + filteredAdditionalEquipmentLength)
  )
}

interface EquipmentProps {
  additionalEquipment: AdditionalEquipment
}

const DIMENSION = '60px'

export function AdditionalEquipmentDiagram(props: EquipmentProps): JSX.Element {
  const { additionalEquipment } = props

  switch (additionalEquipment) {
    case 'wasteChute': {
      return (
        <img
          width={DIMENSION}
          height={DIMENSION}
          src={wasteChuteImage}
          alt={additionalEquipment}
        />
      )
    }
    case 'trashBin': {
      return (
        <img
          width={DIMENSION}
          height={DIMENSION}
          src={trashBinImage}
          alt={additionalEquipment}
        />
      )
    }
    default: {
      return (
        <img
          width={DIMENSION}
          height={DIMENSION}
          src={stagingAreaImage}
          alt={additionalEquipment}
        />
      )
    }
  }
}
