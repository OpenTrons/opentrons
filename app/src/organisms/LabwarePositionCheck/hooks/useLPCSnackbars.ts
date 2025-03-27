import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import isEqual from 'lodash/isEqual'

import {
  OFFSET_KIND_DEFAULT,
  selectSelectedLwDefaultOffsetDetails,
  selectSelectedLwOverview,
  selectSelectedLwWithOffsetDetailsOffsets,
} from '/app/redux/protocol-runs'

import { useToaster } from '/app/organisms/ToasterOven'

export interface UseLPCSnackbarsResult {
  makeSuccessSnackbar: () => void
  makeHardCodedSnackbar: () => void
}

export function useLPCSnackbars(runId: string): UseLPCSnackbarsResult {
  const { t } = useTranslation('labware_position_check')
  const { makeSnackbar } = useToaster()
  const selectedLw = useSelector(selectSelectedLwOverview(runId))
  const details = useSelector(selectSelectedLwWithOffsetDetailsOffsets(runId))
  const defaultDetails = useSelector(
    selectSelectedLwDefaultOffsetDetails(runId)
  )

  const successText = (): string | null => {
    if (selectedLw == null || details == null || defaultDetails == null) {
      return null
    }

    const { workingOffset, existingOffset } = details
    const vectorExists =
      workingOffset?.confirmedVector != null || existingOffset?.vector != null
    const { offsetLocationDetails } = selectedLw

    if (offsetLocationDetails?.kind === OFFSET_KIND_DEFAULT) {
      if (vectorExists) {
        return t('default_location_offset_adjusted')
      } else {
        return t('default_location_offset_added')
      }
    } else {
      const doesLSMatchDefault =
        isEqual(
          workingOffset?.confirmedVector,
          defaultDetails.workingOffset?.confirmedVector
        ) ||
        isEqual(
          workingOffset?.confirmedVector,
          defaultDetails.existingOffset?.vector
        )

      if (!doesLSMatchDefault) {
        if (vectorExists) {
          return t('applied_location_offset_adjusted')
        } else {
          return t('applied_location_offset_added')
        }
      } else {
        return null
      }
    }
  }

  const makeSuccessSnackbar = (): void => {
    const copy = successText()

    if (copy != null) {
      makeSnackbar(copy)
    }
  }

  const makeHardCodedSnackbar = (): void => {
    makeSnackbar(t('modify_hardcoded_offsets_in_protocol') as string)
  }

  return { makeSuccessSnackbar, makeHardCodedSnackbar }
}
