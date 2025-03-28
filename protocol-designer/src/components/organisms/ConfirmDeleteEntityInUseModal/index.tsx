import { useTranslation } from 'react-i18next'
import { createPortal } from 'react-dom'
import {
  Flex,
  JUSTIFY_END,
  Modal,
  PrimaryButton,
  SecondaryButton,
  SPACING,
  StyledText,
} from '@opentrons/components'
import { HandleEnter } from '../../atoms'
import { getMainPagePortalEl } from '../Portal'

interface ConfirmDeleteEntityInUseModalProps {
  onClose: () => void
  onConfirm: () => void
  type: 'clear' | 'reconfigure'
}
export function ConfirmDeleteEntityInUseModal(
  props: ConfirmDeleteEntityInUseModalProps
): JSX.Element {
  const { onClose, onConfirm, type } = props
  const { t } = useTranslation(['create_new_protocol', 'shared'])

  return createPortal(
    <HandleEnter onEnter={onConfirm}>
      <Modal
        marginLeft="0"
        zIndexOverlay={11}
        title={t(`are_you_sure_${type}_slot`)}
        type="info"
        onClose={onClose}
        footer={
          <Flex
            justifyContent={JUSTIFY_END}
            gridGap={SPACING.spacing8}
            padding={SPACING.spacing24}
          >
            <SecondaryButton
              onClick={() => {
                onClose()
              }}
            >
              {t('shared:cancel')}
            </SecondaryButton>
            <PrimaryButton onClick={onConfirm}>{t('clear_slot')}</PrimaryButton>
          </Flex>
        }
      >
        <StyledText desktopStyle="bodyDefaultRegular">
          {t('slot_contains_used_entities')}
        </StyledText>
      </Modal>
    </HandleEnter>,
    getMainPagePortalEl()
  )
}
