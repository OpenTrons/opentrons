import { useTranslation } from 'react-i18next'
import {
  ALIGN_CENTER,
  DIRECTION_COLUMN,
  DIRECTION_ROW,
  Flex,
  JUSTIFY_FLEX_END,
  PrimaryButton,
  SecondaryButton,
  SPACING,
  LegacyStyledText,
  TYPOGRAPHY,
  Modal,
} from '@opentrons/components'
import {
  LPC_STEP_KEY,
  LABWARE_SETUP_STEP_KEY,
  MODULE_SETUP_STEP_KEY,
  ROBOT_CALIBRATION_STEP_KEY,
} from '/app/redux/protocol-runs'
import type { StepKey } from '/app/redux/protocol-runs'

const STEP_KEY_TO_I18N_KEY = {
  [LPC_STEP_KEY]: 'applied_labware_offsets',
  [LABWARE_SETUP_STEP_KEY]: 'labware_placement',
  [MODULE_SETUP_STEP_KEY]: 'module_setup',
  [ROBOT_CALIBRATION_STEP_KEY]: 'robot_calibration',
}

export interface ConfirmMissingStepsModalProps {
  onCloseClick: () => void
  onConfirmClick: () => void
  missingSteps: StepKey[]
}
export const ConfirmMissingStepsModal = (
  props: ConfirmMissingStepsModalProps
): JSX.Element | null => {
  const { missingSteps, onCloseClick, onConfirmClick } = props
  const { t, i18n } = useTranslation(['protocol_setup', 'shared'])

  const confirmAttached = (): void => {
    onConfirmClick()
    onCloseClick()
  }

  return (
    <Modal
      title={t('are_you_sure_you_want_to_proceed')}
      type="warning"
      onClose={onCloseClick}
    >
      <Flex flexDirection={DIRECTION_COLUMN} fontSize={TYPOGRAPHY.fontSizeP}>
        <LegacyStyledText paddingBottom={SPACING.spacing4}>
          {t('you_havent_confirmed', {
            missingSteps: new Intl.ListFormat('en', {
              style: 'short',
              type: 'conjunction',
            }).format(missingSteps.map(step => t(STEP_KEY_TO_I18N_KEY[step]))),
          })}
        </LegacyStyledText>
      </Flex>
      <Flex
        flexDirection={DIRECTION_ROW}
        paddingTop={SPACING.spacing24}
        justifyContent={JUSTIFY_FLEX_END}
        alignItems={ALIGN_CENTER}
        gap={SPACING.spacing8}
      >
        <SecondaryButton onClick={onCloseClick}>
          {i18n.format(t('shared:go_back'), 'capitalize')}
        </SecondaryButton>
        <PrimaryButton onClick={confirmAttached}>
          {t('start_run')}
        </PrimaryButton>
      </Flex>
    </Modal>
  )
}
