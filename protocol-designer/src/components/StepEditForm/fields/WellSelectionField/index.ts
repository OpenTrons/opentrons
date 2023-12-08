import { connect } from 'react-redux'
import { ALL, COLUMN } from '@opentrons/shared-data'
import { selectors as stepFormSelectors } from '../../../../step-forms'
import {
  WellSelectionInput,
  Props as WellSelectionInputProps,
  DP,
} from './WellSelectionInput'
import type { BaseState, NozzleType } from '../../../../types'
import type { FieldProps } from '../../types'

type Props = Omit<
  JSX.LibraryManagedAttributes<
    typeof WellSelectionInput,
    WellSelectionInputProps
  >,
  keyof DP
>
type OP = FieldProps & {
  nozzles: string | null
  labwareId?: string | null
  pipetteId?: string | null
}
interface SP {
  nozzleType: Props['nozzleType']
  primaryWellCount: Props['primaryWellCount']
}

const mapStateToProps = (state: BaseState, ownProps: OP): SP => {
  const { pipetteId, nozzles } = ownProps
  const selectedWells = ownProps.value
  const pipette =
    pipetteId && stepFormSelectors.getPipetteEntities(state)[pipetteId]
  const is8Channel = pipette ? pipette.spec.channels === 8 : false

  let nozzleType: NozzleType | null = null
  if (pipette !== null && is8Channel) {
    nozzleType = '8-channel'
  } else if (nozzles === COLUMN) {
    nozzleType = COLUMN
  } else if (nozzles === ALL) {
    nozzleType = ALL
  }

  return {
    primaryWellCount: Array.isArray(selectedWells)
      ? selectedWells.length
      : undefined,
    nozzleType,
  }
}

function mergeProps(stateProps: SP, _dispatchProps: null, ownProps: OP): Props {
  const {
    disabled,
    errorToShow,
    labwareId,
    name,
    onFieldBlur,
    onFieldFocus,
    pipetteId,
    updateValue,
    value,
  } = ownProps
  return {
    disabled,
    errorToShow,
    nozzleType: stateProps.nozzleType,
    labwareId,
    name,
    onFieldBlur,
    onFieldFocus,
    pipetteId,
    primaryWellCount: stateProps.primaryWellCount,
    updateValue,
    value,
  }
}

export const WellSelectionField = connect(
  mapStateToProps,
  null,
  mergeProps
)(WellSelectionInput)
