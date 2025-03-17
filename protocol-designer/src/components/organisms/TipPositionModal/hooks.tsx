import { useState } from 'react'
import { round } from 'lodash'
import { useTranslation } from 'react-i18next'
import { DropdownMenu } from '@opentrons/components'
import { WELL_BOTTOM, WELL_CENTER, WELL_TOP } from '@opentrons/shared-data'
import type { Dispatch, SetStateAction } from 'react'
import type { DropdownOption } from '@opentrons/components'
import type { PositionReference } from '@opentrons/shared-data'

interface UsePositionReferenceResult {
  positionReferenceDropdown: JSX.Element
  reference: PositionReference
  setReference: Dispatch<SetStateAction<PositionReference>>
}

export function usePositionReference(args: {
  zValue: number
  updateZValue: Dispatch<SetStateAction<string | null>>
  wellDepth: number
  initialReference?: PositionReference | null
}): UsePositionReferenceResult {
  const { initialReference, zValue, updateZValue, wellDepth } = args
  const { t } = useTranslation('modal')
  const [reference, setReference] = useState<PositionReference>(
    initialReference ?? WELL_BOTTOM
  )

  const handleUpdateReference = (
    oldReference: PositionReference,
    newReference: PositionReference,
    zValue: number
  ): void => {
    let newZValue = zValue
    if (oldReference === WELL_BOTTOM) {
      switch (newReference) {
        case WELL_CENTER:
          newZValue = zValue - wellDepth / 2
          break
        case WELL_TOP:
          newZValue = zValue - wellDepth
          break
        default:
          break
      }
    } else if (oldReference === WELL_CENTER) {
      switch (newReference) {
        case WELL_BOTTOM:
          newZValue = zValue + wellDepth / 2
          break
        case WELL_TOP:
          newZValue = zValue - wellDepth / 2
          break
        default:
          break
      }
    } else if (oldReference === WELL_TOP) {
      switch (newReference) {
        case WELL_BOTTOM:
          newZValue = zValue + wellDepth
          break
        case WELL_CENTER:
          newZValue = zValue + wellDepth / 2
          break
        default:
          break
      }
    }
    updateZValue(String(round(newZValue, 1)))
  }

  const referenceOptions: DropdownOption[] = [
    {
      name: t(`tip_position.position_references.${WELL_TOP}`),
      value: WELL_TOP,
    },
    {
      name: t(`tip_position.position_references.${WELL_CENTER}`),
      value: WELL_CENTER,
    },
    {
      name: t(`tip_position.position_references.${WELL_BOTTOM}`),
      value: WELL_BOTTOM,
    },
  ]
  return {
    positionReferenceDropdown: (
      <DropdownMenu
        title={t('tip_position.field_titles.reference_position')}
        dropdownType="neutral"
        width="100%"
        currentOption={
          referenceOptions.find(({ value }) => value === reference) ??
          referenceOptions[0]
        }
        filterOptions={referenceOptions}
        onClick={e => {
          const newReference = e as PositionReference
          handleUpdateReference(reference, newReference, zValue)
          setReference(e as PositionReference)
        }}
      />
    ),
    reference,
    setReference,
  }
}
