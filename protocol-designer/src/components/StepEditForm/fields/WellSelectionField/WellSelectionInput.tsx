import * as React from 'react'
import { connect } from 'react-redux'
import { FormGroup, InputField } from '@opentrons/components'
import { i18n } from '../../../../localization'
import { WellSelectionModal } from './WellSelectionModal'
import { Portal } from '../../../portals/MainPageModalPortal'
import {
  actions as stepsActions,
  getSelectedStepId,
  getWellSelectionLabwareKey,
} from '../../../../ui/steps'
import styles from '../../StepEditForm.css'

import { Dispatch } from 'redux'
import { StepIdType } from '../../../../form-types'
import { BaseState } from '../../../../types'
import { FieldProps } from '../../types'

interface SP {
  stepId?: StepIdType | null
  wellSelectionLabwareKey?: string | null
}

interface DP {
  onOpen: (val: string) => unknown
  onClose: () => unknown
}

type OP = FieldProps & {
  primaryWellCount?: number
  isMulti?: boolean | null
  pipetteId?: string | null
  labwareId?: string | null
}

type Props = OP & SP & DP

class WellSelectionInputComponent extends React.Component<Props> {
  handleOpen = (): void => {
    const { labwareId, pipetteId, onFieldFocus } = this.props

    if (onFieldFocus) {
      onFieldFocus()
    }
    if (labwareId && pipetteId) {
      this.props.onOpen(this.getModalKey())
    }
  }

  handleClose = (): void => {
    const { onFieldBlur, onClose } = this.props
    if (onFieldBlur) {
      onFieldBlur()
    }
    onClose()
  }

  getModalKey = (): React.Key => {
    const { name, pipetteId, labwareId, stepId } = this.props
    return `${String(stepId)}${name}${pipetteId || 'noPipette'}${
      labwareId || 'noLabware'
    }`
  }

  render(): JSX.Element {
    const modalKey = this.getModalKey()
    const label = this.props.isMulti
      ? i18n.t('form.step_edit_form.wellSelectionLabel.columns')
      : i18n.t('form.step_edit_form.wellSelectionLabel.wells')
    return (
      <FormGroup
        label={label}
        disabled={this.props.disabled}
        className={styles.small_field}
      >
        <InputField
          readOnly
          name={this.props.name}
          value={
            this.props.primaryWellCount
              ? String(this.props.primaryWellCount)
              : null
          }
          onClick={this.handleOpen}
          error={this.props.errorToShow}
        />
        <Portal>
          <WellSelectionModal
            isOpen={this.props.wellSelectionLabwareKey === modalKey}
            key={modalKey}
            labwareId={this.props.labwareId}
            name={this.props.name}
            onCloseClick={this.handleClose}
            pipetteId={this.props.pipetteId}
            updateValue={this.props.updateValue}
            value={this.props.value}
          />
        </Portal>
      </FormGroup>
    )
  }
}

const mapStateToProps = (state: BaseState): SP => ({
  stepId: getSelectedStepId(state),
  wellSelectionLabwareKey: getWellSelectionLabwareKey(state),
})
const mapDispatchToProps = (dispatch: Dispatch<any, any>): DP => ({
  onOpen: key => dispatch(stepsActions.setWellSelectionLabwareKey(key)),
  onClose: () => dispatch(stepsActions.clearWellSelectionLabwareKey()),
})

export const WellSelectionInput = connect(
  mapStateToProps,
  mapDispatchToProps
)(WellSelectionInputComponent)
