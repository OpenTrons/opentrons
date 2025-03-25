import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  SPACING,
  COLORS,
  LegacyStyledText,
  Flex,
  DIRECTION_COLUMN,
  TYPOGRAPHY,
} from '@opentrons/components'
import { OddModal } from '/app/molecules/OddModal'
import { SmallButton } from '/app/atoms/buttons'
import { NameQuickTransfer } from './NameQuickTransfer'

interface SaveOrRunModalProps {
  onSave: (protocolName: string) => void
  onRun: () => void
}

export const SaveOrRunModal = (props: SaveOrRunModalProps): JSX.Element => {
  const { t } = useTranslation('quick_transfer')
  const [showNameTransfer, setShowNameTransfer] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(false)

  return showNameTransfer ? (
    <NameQuickTransfer onSave={props.onSave} />
  ) : (
    <OddModal
      header={{
        title: t('run_quick_transfer_now'),
        iconName: 'alert-circle',
        iconColor: COLORS.yellow50,
      }}
    >
      <Flex
        flexDirection={DIRECTION_COLUMN}
        gridGap={SPACING.spacing32}
        width="100%"
      >
        <LegacyStyledText css={TYPOGRAPHY.bodyTextRegular}>
          {t('save_to_run_later')}
        </LegacyStyledText>
        <Flex gridGap={SPACING.spacing8}>
          <SmallButton
            width="50%"
            buttonText={t('save_for_later')}
            disabled={isLoading}
            onClick={() => {
              setShowNameTransfer(true)
            }}
            buttonType="secondary"
          />
          <SmallButton
            width="50%"
            buttonText={t('run_now')}
            disabled={isLoading}
            onClick={() => {
              setIsLoading(true)
              props.onRun()
            }}
          />
        </Flex>
      </Flex>
    </OddModal>
  )
}
