import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DIRECTION_COLUMN,
  Flex,
  JUSTIFY_CENTER,
  JUSTIFY_END,
  Modal,
  PrimaryButton,
  SPACING,
} from '@opentrons/components'
import {
  setLocalStorageItem,
  getLocalStorageItem,
  localStorageAnnouncementKey,
} from '../../../persist'
import { useAnnouncements } from './announcements'

interface AnnouncementModalProps {
  isViewReleaseNotes?: boolean
  onClose?: () => void
}

export const AnnouncementModal = (
  props: AnnouncementModalProps
): JSX.Element => {
  const { onClose, isViewReleaseNotes = false } = props
  const { i18n, t } = useTranslation(['modal', 'button'])
  const announcements = useAnnouncements()

  const { announcementKey, message, heading, image } = announcements[
    announcements.length - 1
  ]

  const userHasNotSeenAnnouncement =
    getLocalStorageItem(localStorageAnnouncementKey) !== announcementKey

  const [showAnnouncementModal, setShowAnnouncementModal] = useState<boolean>(
    isViewReleaseNotes || userHasNotSeenAnnouncement
  )

  const handleClick = (): void => {
    if (onClose != null) {
      onClose()
    }
    setLocalStorageItem(localStorageAnnouncementKey, announcementKey)
    setShowAnnouncementModal(false)
  }

  return (
    <>
      {showAnnouncementModal && (
        <Modal
          childrenPadding={SPACING.spacing24}
          marginLeft="0"
          title={heading}
          type="info"
          footer={
            <Flex
              justifyContent={JUSTIFY_END}
              paddingX={SPACING.spacing24}
              paddingBottom={SPACING.spacing24}
            >
              <PrimaryButton onClick={handleClick}>
                {i18n.format(t('close'), 'capitalize')}
              </PrimaryButton>
            </Flex>
          }
        >
          <Flex
            flexDirection={DIRECTION_COLUMN}
            justifyContent={JUSTIFY_CENTER}
            gridGap={SPACING.spacing12}
          >
            {image != null && image}
            {message}
          </Flex>
        </Modal>
      )}
    </>
  )
}
