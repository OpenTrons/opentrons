import * as React from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { css } from 'styled-components'

import {
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  JUSTIFY_SPACE_BETWEEN,
  SPACING,
  StyledText,
  PrimaryButton,
  JUSTIFY_END,
  ModalHeader,
  ModalShell,
} from '@opentrons/components'

import { TextOnlyButton } from '../../../atoms/buttons'
import { useHomePipettes } from '../../DropTipWizardFlows/hooks'

import type { PipetteData } from '@opentrons/api-client'
import type { IconProps } from '@opentrons/components'
import type { UseHomePipettesProps } from '../../DropTipWizardFlows/hooks'
import type { TipAttachmentStatusResult } from '../../DropTipWizardFlows'

type UseProtocolDropTipModalProps = Pick<
  UseHomePipettesProps,
  'robotType' | 'instrumentModelSpecs' | 'mount'
> & {
  areTipsAttached: TipAttachmentStatusResult['areTipsAttached']
  toggleDTWiz: () => void
  currentRunId: string
  onClose: () => void
  /* True if the most recent run is the current run */
  isRunCurrent: boolean
}

interface UseProtocolDropTipModalResult {
  showDTModal: boolean
  onDTModalSkip: () => void
  onDTModalRemoval: () => void
  isDisabled: boolean
}

// Wraps functionality required for rendering the related modal.
export function useProtocolDropTipModal({
  areTipsAttached,
  toggleDTWiz,
  isRunCurrent,
  onClose,
  ...homePipetteProps
}: UseProtocolDropTipModalProps): UseProtocolDropTipModalResult {
  const [showDTModal, setShowDTModal] = React.useState(areTipsAttached)

  const { homePipettes, isHomingPipettes } = useHomePipettes({
    ...homePipetteProps,
    onComplete: () => {
      onClose()
      setShowDTModal(false)
    },
  })

  // Close the modal if a different app closes the run context.
  React.useEffect(() => {
    if (isRunCurrent && !isHomingPipettes) {
      setShowDTModal(areTipsAttached)
    } else if (!isRunCurrent) {
      setShowDTModal(false)
    }
  }, [isRunCurrent, areTipsAttached, showDTModal]) // Continue to show the modal if a client dismisses the maintenance run on a different app.

  const onDTModalSkip = (): void => {
    homePipettes()
  }

  const onDTModalRemoval = (): void => {
    toggleDTWiz()
    setShowDTModal(false)
  }

  return {
    showDTModal,
    onDTModalSkip,
    onDTModalRemoval,
    isDisabled: isHomingPipettes,
  }
}

interface ProtocolDropTipModalProps {
  onSkip: UseProtocolDropTipModalResult['onDTModalSkip']
  onBeginRemoval: UseProtocolDropTipModalResult['onDTModalRemoval']
  isDisabled: UseProtocolDropTipModalResult['isDisabled']
  mount?: PipetteData['mount']
}

export function ProtocolDropTipModal({
  onSkip,
  onBeginRemoval,
  mount,
  isDisabled,
}: ProtocolDropTipModalProps): JSX.Element {
  const { t } = useTranslation('drop_tip_wizard')

  const buildIcon = (): IconProps => {
    return {
      name: 'information',
      color: COLORS.red50,
      size: SPACING.spacing20,
      marginRight: SPACING.spacing8,
    }
  }

  const buildHeader = (): JSX.Element => {
    return (
      <ModalHeader
        title={t('remove_attached_tips')}
        icon={buildIcon()}
        color={COLORS.black90}
        backgroundColor={COLORS.white}
      />
    )
  }

  return (
    <ModalShell header={buildHeader()} css={MODAL_STYLE}>
      <Flex
        padding={SPACING.spacing24}
        gridGap={SPACING.spacing24}
        flexDirection={DIRECTION_COLUMN}
        justifyContent={JUSTIFY_SPACE_BETWEEN}
      >
        <StyledText desktopStyle="bodyDefaultRegular">
          <Trans
            t={t}
            i18nKey="liquid_damages_this_pipette"
            values={{
              mount,
            }}
            components={{
              mount: <strong />,
            }}
          />
        </StyledText>
        <Flex gridGap={SPACING.spacing24} justifyContent={JUSTIFY_END}>
          <TextOnlyButton
            onClick={onSkip}
            buttonText={t('skip_and_home_pipette')}
            disabled={isDisabled}
          />
          <PrimaryButton onClick={onBeginRemoval} disabled={isDisabled}>
            {t('begin_removal')}
          </PrimaryButton>
        </Flex>
      </Flex>
    </ModalShell>
  )
}

const MODAL_STYLE = css`
  width: 500px;
`
