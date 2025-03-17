import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import {
  DIRECTION_COLUMN,
  DIRECTION_ROW,
  Flex,
  OVERFLOW_AUTO,
  ReleaseNotes,
  SPACING,
} from '@opentrons/components'
import { SmallButton } from '/app/atoms/buttons'
import { InlineNotification } from '/app/atoms/InlineNotification'
import { OddModal } from '/app/molecules/OddModal'
import { useIsOEMMode } from '/app/resources/robot-settings'

import type { OddModalHeaderBaseProps } from '/app/molecules/OddModal/types'

interface RobotSystemVersionModalProps {
  version: string
  releaseNotes: string
  setShowModal: (showModal: boolean) => void
}

export function RobotSystemVersionModal({
  version,
  releaseNotes,
  setShowModal,
}: RobotSystemVersionModalProps): JSX.Element {
  const { t } = useTranslation(['device_settings', 'shared'])
  const navigate = useNavigate()
  const isOEMMode = useIsOEMMode()

  const modalHeader: OddModalHeaderBaseProps = {
    title: t('robot_system_version_available', {
      releaseVersion: version,
    }),
  }

  return (
    <OddModal header={modalHeader} modalSize="large">
      <Flex
        flexDirection={DIRECTION_COLUMN}
        gridGap={SPACING.spacing32}
        width="100%"
      >
        <Flex
          flexDirection={DIRECTION_COLUMN}
          gridGap={SPACING.spacing24}
          overflow={OVERFLOW_AUTO}
        >
          <InlineNotification
            type="neutral"
            heading={t('update_requires_restarting_robot')}
            hug
          />
          <ReleaseNotes source={releaseNotes} isOEMMode={isOEMMode} />
        </Flex>
        <Flex flexDirection={DIRECTION_ROW} gridGap={SPACING.spacing8}>
          <SmallButton
            flex="1"
            onClick={() => {
              setShowModal(false)
            }}
            buttonText={t('not_now')}
            buttonType="secondary"
          />
          <SmallButton
            flex="1"
            onClick={() => {
              navigate('/robot-settings/update-robot')
            }}
            buttonText={t('shared:update')}
          />
        </Flex>
      </Flex>
    </OddModal>
  )
}
