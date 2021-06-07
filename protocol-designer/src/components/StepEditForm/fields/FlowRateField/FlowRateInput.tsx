// @flow
import * as React from 'react'
import round from 'lodash/round'
import {
  AlertModal,
  FormGroup,
  RadioGroup,
  InputField,
} from '@opentrons/components'
import { i18n } from '../../../../localization'
import { Portal } from '../../../portals/MainPageModalPortal'
import modalStyles from '../../../modals/modal.css'
import stepFormStyles from '../../StepEditForm.css'
import styles from './FlowRateInput.css'
import type { FieldProps } from '../../types'

const DEFAULT_LABEL = i18n.t('form.step_edit_form.field.flow_rate.label')
const DECIMALS_ALLOWED = 1

/** When flow rate is falsey (including 0), it means 'use default' */
export type FlowRateInputProps = {|
  ...FieldProps,
  defaultFlowRate: ?number,
  flowRateType: 'aspirate' | 'dispense',
  label: ?string,
  minFlowRate: number,
  maxFlowRate: number,
  pipetteDisplayName: ?string,
  className?: string,
|}

type State = {|
  isPristine: boolean,
  modalFlowRate: ?string,
  modalUseDefault: boolean,
  showModal: boolean,
|}

export const FlowRateInput = (props: FlowRateInputProps): React.Node => {
  const {
    className,
    defaultFlowRate,
    disabled,
    flowRateType,
    isIndeterminate,
    label,
    maxFlowRate,
    minFlowRate,
    name,
    pipetteDisplayName,
  } = props

  const initialState: State = {
    isPristine: true,
    modalFlowRate: props.value ? String(props.value) : null,
    modalUseDefault: !props.value && !isIndeterminate,
    showModal: false,
  }

  const [isPristine, setIsPristine] = React.useState<
    $PropertyType<State, 'isPristine'>
  >(initialState.isPristine)

  const [modalFlowRate, setModalFlowRate] = React.useState<
    $PropertyType<State, 'modalFlowRate'>
  >(initialState.modalFlowRate)

  const [modalUseDefault, setModalUseDefault] = React.useState<
    $PropertyType<State, 'modalUseDefault'>
  >(initialState.modalUseDefault)

  const [showModal, setShowModal] = React.useState<
    $PropertyType<State, 'showModal'>
  >(initialState.showModal)

  const resetModalState = (): void => {
    setShowModal(initialState.showModal)
    setModalFlowRate(initialState.modalFlowRate)
    setModalUseDefault(initialState.modalUseDefault)
    setIsPristine(initialState.isPristine)
  }

  const cancelModal = resetModalState

  const openModal = (): void => {
    setShowModal(true)
  }

  const makeSaveModal = (allowSave: boolean) => (): void => {
    setIsPristine(false)

    if (allowSave) {
      const newFlowRate = modalUseDefault ? null : Number(modalFlowRate)
      props.updateValue(newFlowRate)
      resetModalState()
    }
  }

  const handleChangeRadio = (e: SyntheticInputEvent<>): void => {
    setModalUseDefault(e.target.value !== 'custom')
  }

  const handleChangeNumber = (e: SyntheticInputEvent<>) => {
    const value = e.target.value
    if (value === '' || value === '.' || !Number.isNaN(Number(value))) {
      setModalFlowRate(value)
      setModalUseDefault(false)
    }
  }

  const modalFlowRateNum = Number(modalFlowRate)

  // show 0.1 not 0 as minimum, since bottom of range is non-inclusive
  const displayMinFlowRate = minFlowRate || Math.pow(10, -DECIMALS_ALLOWED)
  const rangeDescription = `between ${displayMinFlowRate} and ${maxFlowRate}`
  const outOfBounds =
    modalFlowRateNum === 0 ||
    minFlowRate > modalFlowRateNum ||
    modalFlowRateNum > maxFlowRate
  const correctDecimals =
    round(modalFlowRateNum, DECIMALS_ALLOWED) === modalFlowRateNum
  const allowSave = modalUseDefault || (!outOfBounds && correctDecimals)

  let errorMessage = null
  // validation only happens when "Custom" is selected, not "Default"
  // and pristinity only masks the outOfBounds error, not the correctDecimals error
  if (!modalUseDefault) {
    if (!Number.isNaN(modalFlowRateNum) && !correctDecimals) {
      errorMessage = `a max of ${DECIMALS_ALLOWED} decimal place${
        DECIMALS_ALLOWED > 1 ? 's' : ''
      } is allowed`
    } else if (!isPristine && outOfBounds) {
      errorMessage = `accepted range is ${displayMinFlowRate} to ${maxFlowRate}`
    }
  }

  const FlowRateInputField = (
    <InputField
      disabled={disabled}
      caption={rangeDescription}
      error={errorMessage}
      isIndeterminate={isIndeterminate && modalFlowRate === null}
      name={`${name}_customFlowRate`}
      onChange={handleChangeNumber}
      units={i18n.t('application.units.microliterPerSec')}
      value={`${modalFlowRate || ''}`}
    />
  )

  const FlowRateModal = pipetteDisplayName && (
    <Portal>
      <AlertModal
        alertOverlay
        className={modalStyles.modal}
        buttons={[
          {
            children: 'Cancel',
            onClick: cancelModal,
          },
          {
            children: 'Done',
            onClick: makeSaveModal(allowSave),
            disabled: isPristine ? false : !allowSave,
          },
        ]}
      >
        <h3 className={styles.header}>Flow Rate</h3>

        <div className={styles.description}>
          {`Our default aspirate speed is optimal for a ${pipetteDisplayName}
            aspirating liquids with a viscosity similar to water`}
        </div>

        <div className={styles.flow_rate_type_label}>
          {`${flowRateType} speed`}
        </div>

        <RadioGroup
          inline
          value={modalUseDefault ? 'default' : 'custom'}
          onChange={handleChangeRadio}
          options={[
            {
              name: `${defaultFlowRate || '?'} ${i18n.t(
                'application.units.microliterPerSec'
              )} (default)`,
              value: 'default',
            },
            {
              name: 'Custom',
              value: 'custom',
              children: FlowRateInputField,
            },
          ]}
        />
      </AlertModal>
    </Portal>
  )

  return (
    <React.Fragment>
      <FormGroup label={label || DEFAULT_LABEL} disabled={disabled}>
        <InputField
          className={className || stepFormStyles.small_field}
          disabled={disabled}
          isIndeterminate={isIndeterminate}
          name={name}
          onClick={openModal}
          readOnly
          units={i18n.t('application.units.microliterPerSec')}
          value={props.value ? String(props.value) : 'default'}
        />
      </FormGroup>

      {showModal && FlowRateModal}
    </React.Fragment>
  )
}
