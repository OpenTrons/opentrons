import * as React from 'react'
import cx from 'classnames'
import { useTranslation } from 'react-i18next'
import { Portal } from '../../../portals/MainPageModalPortal'
import {
  Modal,
  OutlineButton,
  DeprecatedPrimaryButton,
  FormGroup,
  DropdownField,
} from '@opentrons/components'
import modalStyles from '../../../modals/modal.css'
import { WellOrderOption } from '../../../../form-types'

import { WellOrderViz } from './WellOrderViz'
import styles from './WellOrderInput.css'
import stepEditStyles from '../../StepEditForm.css'

const DEFAULT_FIRST: WellOrderOption = 't2b'
const DEFAULT_SECOND: WellOrderOption = 'l2r'
const VERTICAL_VALUES: WellOrderOption[] = ['t2b', 'b2t']
const HORIZONTAL_VALUES: WellOrderOption[] = ['l2r', 'r2l']
const WELL_ORDER_VALUES: WellOrderOption[] = [
  ...VERTICAL_VALUES,
  ...HORIZONTAL_VALUES,
]

export interface WellOrderModalProps {
  isOpen: boolean
  closeModal: () => unknown
  prefix: 'aspirate' | 'dispense' | 'mix'
  firstValue?: WellOrderOption | null
  secondValue?: WellOrderOption | null
  firstName: string
  secondName: string
  updateValues: (
    firstValue?: WellOrderOption | null,
    secondValue?: WellOrderOption | null
  ) => void
}

interface State {
  firstValue: WellOrderOption
  secondValue: WellOrderOption
}

export const ResetButton = (props: { onClick: () => void }): JSX.Element => {
  const { t } = useTranslation('button')
  return (
    <OutlineButton
      className={modalStyles.button_medium}
      onClick={props.onClick}
    >
      {t('reset')}
    </OutlineButton>
  )
}

export const CancelButton = (props: { onClick: () => void }): JSX.Element => {
  const { t } = useTranslation('button')

  return (
    <DeprecatedPrimaryButton
      className={cx(
        modalStyles.button_medium,
        modalStyles.button_right_of_break
      )}
      onClick={props.onClick}
    >
      {t('cancel')}
    </DeprecatedPrimaryButton>
  )
}
export const DoneButton = (props: { onClick: () => void }): JSX.Element => {
  const { t } = useTranslation('button')

  return (
    <DeprecatedPrimaryButton
      className={modalStyles.button_medium}
      onClick={props.onClick}
    >
      {t('done')}
    </DeprecatedPrimaryButton>
  )
}
export const WellOrderModal = (
  props: WellOrderModalProps
): JSX.Element | null => {
  const {
    isOpen,
    closeModal,
    firstValue,
    secondValue,
    firstName,
    secondName,
    updateValues,
  } = props
  const { t } = useTranslation(['form', 'modal'])
  const getInitialFirstValues: () => {
    initialFirstValue: WellOrderOption
    initialSecondValue: WellOrderOption
  } = () => {
    if (firstValue == null || secondValue == null) {
      return {
        initialFirstValue: DEFAULT_FIRST,
        initialSecondValue: DEFAULT_SECOND,
      }
    }
    return {
      initialFirstValue: firstValue,
      initialSecondValue: secondValue,
    }
  }

  const { initialFirstValue, initialSecondValue } = getInitialFirstValues()
  const [state, setState] = React.useState<State>({
    firstValue: initialFirstValue,
    secondValue: initialSecondValue,
  })

  const applyChanges = (): void => {
    updateValues(state.firstValue, state.secondValue)
  }

  const handleReset = (): void => {
    setState({ firstValue: DEFAULT_FIRST, secondValue: DEFAULT_SECOND })
    applyChanges()
    closeModal()
  }

  const handleCancel = (): void => {
    setState({
      firstValue: initialFirstValue,
      secondValue: initialSecondValue,
    })
    closeModal()
  }

  const handleDone = (): void => {
    applyChanges()
    closeModal()
  }

  const makeOnChange: (
    ordinality: 'first' | 'second'
  ) => (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => void = ordinality => event => {
    const { value } = event.currentTarget
    // @ts-expect-error (ce, 2021-06-22) missing one prop or the other
    let nextState: State = { [`${ordinality}Value`]: value }
    if (ordinality === 'first') {
      if (
        VERTICAL_VALUES.includes(value as WellOrderOption) &&
        VERTICAL_VALUES.includes(state.secondValue)
      ) {
        nextState = { ...nextState, secondValue: HORIZONTAL_VALUES[0] }
      } else if (
        HORIZONTAL_VALUES.includes(value as WellOrderOption) &&
        HORIZONTAL_VALUES.includes(state.secondValue)
      ) {
        nextState = { ...nextState, secondValue: VERTICAL_VALUES[0] }
      }
    }
    setState(nextState)
  }

  const isSecondOptionDisabled: (
    wellOrderOption: WellOrderOption
  ) => boolean = (value: WellOrderOption) => {
    if (VERTICAL_VALUES.includes(state.firstValue)) {
      return VERTICAL_VALUES.includes(value)
    } else if (HORIZONTAL_VALUES.includes(state.firstValue)) {
      return HORIZONTAL_VALUES.includes(value)
    } else {
      return false
    }
  }

  if (!isOpen) return null

  return (
    <Portal>
      <Modal
        className={modalStyles.modal}
        contentsClassName={cx(modalStyles.modal_contents)}
        onCloseClick={handleCancel}
      >
        <div className={styles.modal_header}>
          <h4>{t('modal:well_order.title')}</h4>
          <p>{t('modal:well_order.body')}</p>
        </div>
        <div className={styles.main_row}>
          <FormGroup label={t('modal:well_order.field_label')}>
            <div className={styles.field_row}>
              <DropdownField
                name={firstName}
                value={firstValue}
                className={cx(stepEditStyles.field, styles.well_order_dropdown)}
                onChange={makeOnChange('first')}
                options={WELL_ORDER_VALUES.map(value => ({
                  value,
                  name: t(`step_edit_form.field.well_order.option.${value}`),
                }))}
              />
              <span className={styles.field_spacer}>
                {t('modal:well_order.then')}
              </span>
              <DropdownField
                name={secondName}
                value={secondValue}
                className={cx(stepEditStyles.field, styles.well_order_dropdown)}
                onChange={makeOnChange('second')}
                options={WELL_ORDER_VALUES.map(value => ({
                  value,
                  name: t(`step_edit_form.field.well_order.option.${value}`),
                  disabled: isSecondOptionDisabled(value),
                }))}
              />
            </div>
          </FormGroup>
          <FormGroup label={t('well_order.viz_label')}>
            <WellOrderViz
              firstValue={firstValue ?? 'l2r'}
              secondValue={secondValue ?? 'l2r'}
            />
          </FormGroup>
        </div>
        <div className={modalStyles.button_row_divided}>
          <ResetButton onClick={handleReset} />
          <div>
            <CancelButton onClick={handleCancel} />
            <DoneButton onClick={handleDone} />
          </div>
        </div>
      </Modal>
    </Portal>
  )
}
