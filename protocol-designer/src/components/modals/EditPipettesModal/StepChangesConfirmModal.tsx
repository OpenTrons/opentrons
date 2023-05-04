import { i18n } from '../../../localization'
import modalStyles from '../modal.css'
import styles from './StepChangesConfirmModal.css'
import { AlertModal, OutlineButton } from '@opentrons/components'
import * as React from 'react'

interface Props {
  onCancel: () => void
  onConfirm: () => void
}

export const StepChangesConfirmModal = (props: Props): JSX.Element => {
  const { onCancel, onConfirm } = props

  return (
    <AlertModal
      alertOverlay
      className={modalStyles.modal}
      heading={i18n.t('modal.global_step_changes.heading')}
    >
      <p>{i18n.t('modal.global_step_changes.switch_pipettes.body')}</p>
      <ul className={styles.cause_effect_list}>
        <li className={styles.cause_effect_item}>
          <p className={styles.cause}>
            {i18n.t('modal.global_step_changes.switch_pipettes.cause.any')}
          </p>
          <p>
            {i18n.t('modal.global_step_changes.switch_pipettes.effect.any')}
          </p>
        </li>
        <li className={styles.cause_effect_item}>
          <p className={styles.cause}>
            {i18n.t(
              'modal.global_step_changes.switch_pipettes.cause.multi_to_single'
            )}
          </p>
          <p>
            {i18n.t(
              'modal.global_step_changes.switch_pipettes.effect.multi_to_single'
            )}
          </p>
        </li>
        <li className={styles.cause_effect_item}>
          <p className={styles.cause}>
            {i18n.t(
              'modal.global_step_changes.switch_pipettes.cause.single_to_multi'
            )}
          </p>
          <p>
            {i18n.t(
              'modal.global_step_changes.switch_pipettes.effect.single_to_multi'
            )}
          </p>
        </li>
        <li className={styles.cause_effect_item}>
          <p className={styles.cause}>
            {i18n.t(
              'modal.global_step_changes.switch_pipettes.cause.next_pipette_smaller'
            )}
          </p>
          <p>
            {i18n.t(
              'modal.global_step_changes.switch_pipettes.effect.next_pipette_smaller'
            )}
          </p>
        </li>
      </ul>

      <div className={modalStyles.button_row}>
        <OutlineButton onClick={onCancel}>
          {i18n.t('button.cancel')}
        </OutlineButton>
        <OutlineButton className={styles.continue_button} onClick={onConfirm}>
          {i18n.t('button.continue')}
        </OutlineButton>
      </div>
    </AlertModal>
  )
}
