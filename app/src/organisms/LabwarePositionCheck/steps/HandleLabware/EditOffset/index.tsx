import { useDispatch, useSelector } from 'react-redux'

import { PrepareLabware } from './PrepareLabware'
import { CheckLabware } from '/app/organisms/LabwarePositionCheck/steps/HandleLabware/EditOffset/CheckLabware'

import type { LPCWizardContentProps } from '/app/organisms/LabwarePositionCheck/types'
import {
  goBackEditOffsetSubstep,
  HANDLE_LW_SUBSTEP,
  proceedEditOffsetSubstep,
  selectCurrentSubstep,
  selectSelectedLwFlowType,
  selectSelectedLwWithOffsetDetailsMostRecentVectorOffset,
} from '/app/redux/protocol-runs'
import { useTranslation } from 'react-i18next'

export function EditOffset(props: LPCWizardContentProps): JSX.Element {
  const { t } = useTranslation('labware_position_check')
  const dispatch = useDispatch()
  const flowType = useSelector(selectSelectedLwFlowType(props.runId))
  const mostRecentVectorOffset = useSelector(
    selectSelectedLwWithOffsetDetailsMostRecentVectorOffset(props.runId)
  )

  const goBackSubstep = (): void => {
    dispatch(goBackEditOffsetSubstep(props.runId))
  }

  const proceedSubstep = (): void => {
    dispatch(proceedEditOffsetSubstep(props.runId))
  }

  const contentHeader = (): string => {
    switch (flowType) {
      case 'default': {
        if (mostRecentVectorOffset == null) {
          return t('add_default_labware_offset')
        } else {
          return t('adjust_default_labware_offset')
        }
      }
      case 'location-specific':
        return t('adjust_applied_location_offset')
      default: {
        console.error('Unhandled flow type.')
        return t('add_default_labware_offset')
      }
    }
  }

  return (
    <EditOffsetContent
      {...props}
      proceedSubstep={proceedSubstep}
      goBackSubstep={goBackSubstep}
      contentHeader={contentHeader()}
    />
  )
}

export interface EditOffsetContentProps extends LPCWizardContentProps {
  proceedSubstep: () => void
  goBackSubstep: () => void
  contentHeader: string
}

export function EditOffsetContent(props: EditOffsetContentProps): JSX.Element {
  const currentSubStep = useSelector(selectCurrentSubstep(props.runId))

  switch (currentSubStep) {
    case HANDLE_LW_SUBSTEP.EDIT_OFFSET_PREP_LW:
      return <PrepareLabware {...props} />
    case HANDLE_LW_SUBSTEP.EDIT_OFFSET_CHECK_LW:
      return <CheckLabware {...props} />
    default:
      return <></>
  }
}
