import { useSelector } from 'react-redux'

import {
  HANDLE_LW_SUBSTEP,
  selectCurrentSubstep,
} from '/app/redux/protocol-runs'
import { LPCLabwareList } from './LPCLabwareList'
import { LPCLabwareDetails } from './LPCLabwareDetails'
import { EditOffset } from '/app/organisms/LabwarePositionCheck/steps/HandleLabware/EditOffset'

import type { LPCWizardContentProps } from '/app/organisms/LabwarePositionCheck/types'

export function HandleLabware(props: LPCWizardContentProps): JSX.Element {
  return <HandleLabwareContent {...props} />
}

function HandleLabwareContent(props: LPCWizardContentProps): JSX.Element {
  const currentSubStep = useSelector(selectCurrentSubstep(props.runId))

  // These views are one step, since the progress bar remains static during the core LPC flow. Therefore, we use substeps to navigate.
  switch (currentSubStep) {
    // The general labware list view.
    case HANDLE_LW_SUBSTEP.LIST: {
      return <LPCLabwareList {...props} />
    }

    // The offset view for a singular labware geometry.
    case HANDLE_LW_SUBSTEP.DETAILS: {
      return <LPCLabwareDetails {...props} />
    }

    // The core edit flow for updating an offset for a singular labware geometry.
    case HANDLE_LW_SUBSTEP.EDIT_OFFSET_PREP_LW:
    case HANDLE_LW_SUBSTEP.EDIT_OFFSET_CHECK_LW:
    case HANDLE_LW_SUBSTEP.EDIT_OFFSET_SUCCESS: {
      return <EditOffset {...props} />
    }

    default: {
      console.error('Unexpected HandleLabware view.')
      return <LPCLabwareList {...props} />
    }
  }
}
