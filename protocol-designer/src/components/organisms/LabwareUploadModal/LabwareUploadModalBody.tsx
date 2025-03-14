import { useTranslation } from 'react-i18next'
import {
  DIRECTION_COLUMN,
  Flex,
  SPACING,
  StyledText,
} from '@opentrons/components'
import type { LabwareUploadMessage } from '../../../labware-defs'

export function LabwareUploadModalBody(props: {
  message: LabwareUploadMessage
}): JSX.Element | null {
  const { message } = props
  const { t } = useTranslation('shared')

  const validMessageTypes = [
    'EXACT_LABWARE_MATCH',
    'INVALID_JSON_FILE',
    'ONLY_TIPRACK',
    'NOT_JSON',
    'USES_STANDARD_NAMESPACE',
  ]

  if (validMessageTypes.includes(message.messageType)) {
    return (
      <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing4}>
        <StyledText desktopStyle="bodyDefaultRegular">
          {t(`message_${message.messageType.toLowerCase()}`)}
        </StyledText>
        {'errorText' in message ? (
          <StyledText desktopStyle="bodyDefaultRegular">
            {message.errorText}
          </StyledText>
        ) : null}
      </Flex>
    )
  } else if (
    message.messageType === 'ASK_FOR_LABWARE_OVERWRITE' ||
    message.messageType === 'LABWARE_NAME_CONFLICT'
  ) {
    const { defsMatchingDisplayName, defsMatchingLoadName } = message
    const canOverwrite = message.messageType === 'ASK_FOR_LABWARE_OVERWRITE'
    return (
      <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing4}>
        <StyledText desktopStyle="bodyDefaultRegular">
          {t('shares_name', {
            customOrStandard: canOverwrite ? 'custom' : 'Opentrons standard',
          })}
        </StyledText>
        {canOverwrite && defsMatchingLoadName.length > 0 ? (
          <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing4}>
            <StyledText desktopStyle="bodyDefaultSemiBold">
              {t('shared_load_name')}
              {defsMatchingLoadName
                .map(def => def?.parameters.loadName || '?')
                .join(', ')}
            </StyledText>
            <StyledText desktopStyle="bodyDefaultSemiBold">
              {t('shared_display_name')}
              {defsMatchingDisplayName
                .map(def => def?.metadata.displayName || '?')
                .join(', ')}
            </StyledText>
          </Flex>
        ) : null}
        <StyledText desktopStyle="bodyDefaultRegular">
          {t('re_export')}
        </StyledText>
        {canOverwrite ? (
          <StyledText desktopStyle="bodyDefaultRegular">
            {t('overwrite')}
          </StyledText>
        ) : null}
        {canOverwrite &&
        'isOverwriteMismatched' in message &&
        message.isOverwriteMismatched ? (
          <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing4}>
            <StyledText desktopStyle="bodyDefaultSemiBold">
              {t('labware_upload_message.name_conflict.warning')}
            </StyledText>
            <StyledText desktopStyle="bodyDefaultRegular">
              {t('labware_upload_message.name_conflict.mismatched')}
            </StyledText>
          </Flex>
        ) : null}
      </Flex>
    )
  }
  console.assert(
    false,
    `MessageBody got unhandled messageType: ${message.messageType}`
  )
  return null
}
