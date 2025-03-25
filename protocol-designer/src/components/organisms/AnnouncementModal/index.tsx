import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ALIGN_CENTER,
  DIRECTION_COLUMN,
  Flex,
  Icon,
  JUSTIFY_CENTER,
  JUSTIFY_END,
  Link,
  Modal,
  PrimaryButton,
  SPACING,
  StyledText,
  TYPOGRAPHY,
} from '@opentrons/components'
import {
  setLocalStorageItem,
  getLocalStorageItem,
  localStorageAnnouncementKey,
} from '../../../persist'
import { RELEASE_NOTES_URL } from '../KnowledgeLink'
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
              alignItems={ALIGN_CENTER}
              gridGap={SPACING.spacing8}
            >
              <Link
                external
                href={RELEASE_NOTES_URL}
                css={TYPOGRAPHY.linkPSemiBold}
              >
                <Flex alignItems={ALIGN_CENTER} gridGap={SPACING.spacing8}>
                  <StyledText>{t('view_full_release_notes')}</StyledText>
                  <Icon
                    size={SPACING.spacing8}
                    name="open-in-new"
                    aria-label="open_in_new_icon"
                  />
                </Flex>
              </Link>

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
