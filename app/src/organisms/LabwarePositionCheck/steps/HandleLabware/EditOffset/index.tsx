import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'

import { PrepareLabware } from './PrepareLabware'
import { CheckLabware } from '/app/organisms/LabwarePositionCheck/steps/HandleLabware/EditOffset/CheckLabware'
import {
  goBackEditOffsetSubstep,
  HANDLE_LW_SUBSTEP,
  proceedEditOffsetSubstep,
  selectActivePipette,
  selectCurrentSubstep,
  selectSelectedLwFlowType,
  selectSelectedLwOverview,
  selectSelectedLwWithOffsetDetailsMostRecentVectorOffset,
  setFinalPosition,
} from '/app/redux/protocol-runs'
import { DesktopOffsetSuccess } from '/app/organisms/LabwarePositionCheck/steps/HandleLabware/EditOffset/DesktopOffsetSuccess'

import type { LPCWizardContentProps } from '/app/organisms/LabwarePositionCheck/types'
import type { LoadedPipette } from '@opentrons/shared-data'
import type {
  SelectedLwOverview,
  OffsetLocationDetails,
} from '/app/redux/protocol-runs'

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
  const dispatch = useDispatch()
  const { toggleRobotMoving, handleConfirmLwFinalPosition } = props.commandUtils
  const currentSubStep = useSelector(selectCurrentSubstep(props.runId))

  const selectedLwInfo = useSelector(
    selectSelectedLwOverview(props.runId)
  ) as SelectedLwOverview
  const offsetLocationDetails = selectedLwInfo.offsetLocationDetails as OffsetLocationDetails
  const pipette = useSelector(selectActivePipette(props.runId)) as LoadedPipette

  const handleAddConfirmedWorkingVector = (): void => {
    void toggleRobotMoving(true)
      .then(() => handleConfirmLwFinalPosition(offsetLocationDetails, pipette))
      .then(position => {
        dispatch(
          setFinalPosition(props.runId, {
            labwareUri: selectedLwInfo.uri,
            location: offsetLocationDetails,
            position,
          })
        )
      })
      .then(() => {
        dispatch(proceedEditOffsetSubstep(props.runId))
      })
      .finally(() => toggleRobotMoving(false))
  }

  switch (currentSubStep) {
    case HANDLE_LW_SUBSTEP.EDIT_OFFSET_PREP_LW:
      return <PrepareLabware {...props} />
    case HANDLE_LW_SUBSTEP.EDIT_OFFSET_CHECK_LW:
      return (
        <CheckLabware
          {...props}
          handleAddConfirmedWorkingVector={handleAddConfirmedWorkingVector}
        />
      )
    // This routing only happens conditionally if the sub-step is check-labware.
    case HANDLE_LW_SUBSTEP.EDIT_OFFSET_SUCCESS:
      return (
        <DesktopOffsetSuccess
          {...props}
          handleAddConfirmedWorkingVector={handleAddConfirmedWorkingVector}
        />
      )
    default:
      return <></>
  }
}
