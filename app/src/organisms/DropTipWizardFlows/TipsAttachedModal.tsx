import * as React from 'react'
import capitalize from 'lodash/capitalize'
import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { Trans, useTranslation } from 'react-i18next'

import {
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  SPACING,
  LegacyStyledText,
} from '@opentrons/components'
import { ApiHostProvider } from '@opentrons/react-api-client'
import { FLEX_ROBOT_TYPE } from '@opentrons/shared-data'

import { SmallButton } from '../../atoms/buttons'
import { Modal } from '../../molecules/Modal'
import { DropTipWizardFlows, useDropTipWizardFlows } from '.'
import { useHomePipettes } from './hooks'

import type { HostConfig } from '@opentrons/api-client'
import type { ModalHeaderBaseProps } from '../../molecules/Modal/types'
import type { PipetteWithTip } from '.'
import type { UseHomePipettesProps } from './hooks'

type TipsAttachedModalProps = Pick<
  UseHomePipettesProps,
  'robotType' | 'instrumentModelSpecs' | 'mount'
> & {
  aPipetteWithTip: PipetteWithTip
  host: HostConfig | null
  setTipStatusResolved: (onEmpty?: () => void) => Promise<void>
  onClose: () => void
}

export const handleTipsAttachedModal = (
  props: TipsAttachedModalProps
): Promise<unknown> => {
  return NiceModal.show(TipsAttachedModal, {
    ...props,
  })
}

const TipsAttachedModal = NiceModal.create(
  (props: TipsAttachedModalProps): JSX.Element => {
    const {
      aPipetteWithTip,
      host,
      setTipStatusResolved,
      ...homePipetteProps
    } = props
    const { t } = useTranslation(['drop_tip_wizard'])
    const modal = useModal()

    const { mount, specs } = aPipetteWithTip
    const { showDTWiz, toggleDTWiz } = useDropTipWizardFlows()
    const { homePipettes, isHomingPipettes } = useHomePipettes({
      ...homePipetteProps,
      onComplete: () => {
        cleanUpAndClose()
      },
    })

    const tipsAttachedHeader: ModalHeaderBaseProps = {
      title: t('remove_any_attached_tips'),
      iconName: 'ot-alert',
      iconColor: COLORS.red50,
    }

    const onHomePipettes = (): void => {
      homePipettes()
    }

    const cleanUpAndClose = (): void => {
      modal.remove()
      props.onClose()
    }

    const is96Channel = specs.channels === 96
    const displayMountText = is96Channel
      ? '96-Channel'
      : capitalize(mount as string)

    return (
      <ApiHostProvider {...host} hostname={host?.hostname ?? null}>
        <Modal header={tipsAttachedHeader}>
          <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing32}>
            <LegacyStyledText as="p">
              <Trans
                t={t}
                i18nKey="liquid_damages_this_pipette"
                values={{
                  mount: displayMountText,
                }}
                components={{
                  mount: <strong />,
                }}
              />
            </LegacyStyledText>
            <Flex gridGap={SPACING.spacing8}>
              <SmallButton
                flex="1"
                buttonType="secondary"
                buttonText={t('skip_and_home_pipette')}
                onClick={onHomePipettes}
                disabled={isHomingPipettes}
              />
              <SmallButton
                flex="1"
                buttonText={t('begin_removal')}
                onClick={toggleDTWiz}
                disabled={isHomingPipettes}
              />
            </Flex>
          </Flex>
        </Modal>
        {showDTWiz ? (
          <DropTipWizardFlows
            instrumentModelSpecs={specs}
            mount={mount}
            robotType={FLEX_ROBOT_TYPE}
            closeFlow={() => {
              cleanUpAndClose()
            }}
          />
        ) : null}
      </ApiHostProvider>
    )
  }
)
