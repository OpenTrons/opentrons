import { useTranslation } from 'react-i18next'
import { useDispatch } from 'react-redux'
import { v4 as uuidv4 } from 'uuid'

import {
  AlertPrimaryButton,
  ALIGN_FLEX_END,
  DIRECTION_COLUMN,
  Flex,
  Modal,
  SecondaryButton,
  SPACING,
  StyledText,
} from '@opentrons/components'

import { actions } from '../load-file'
import { analyticsEvent } from '../analytics/actions'

import type { FallbackProps } from 'react-error-boundary'
import type { ThunkDispatch } from '../types'
import type { AnalyticsEvent } from '../analytics/mixpanel'

export function ProtocolDesignerAppFallback({
  error,
  resetErrorBoundary,
}: FallbackProps): JSX.Element {
  const { t } = useTranslation('shared')
  const dispatch: ThunkDispatch<any> = useDispatch()

  // Note (kk:02/12/25) this is to track a users' error since many users send a screenshot.
  const errorId = uuidv4()

  const errorEvent: AnalyticsEvent = {
    name: 'protocolDesignerAppError',
    properties: {
      errorId,
      errorStack: error.stack,
      errorMessage: error.message,
    },
  }

  const handleReloadClick = (): void => {
    dispatch(analyticsEvent(errorEvent))
    resetErrorBoundary()
  }
  const handleDownloadProtocol = (): void => {
    dispatch(actions.saveProtocolFile())
  }

  return (
    <Modal type="warning" title={t('error_boundary_title')} marginLeft="0">
      <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing32}>
        <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing8}>
          <StyledText desktopStyle="bodyDefaultRegular">
            {t('error_boundary_pd_app_description')}
          </StyledText>
          <StyledText desktopStyle="bodyDefaultSemiBold">
            {error.message}
          </StyledText>
          <StyledText desktopStyle="bodyDefaultRegular">{errorId}</StyledText>
        </Flex>
        <Flex alignSelf={ALIGN_FLEX_END} gridGap={SPACING.spacing8}>
          <SecondaryButton onClick={handleDownloadProtocol}>
            {t('download_protocol')}
          </SecondaryButton>
          <AlertPrimaryButton onClick={handleReloadClick}>
            {t('reload_app')}
          </AlertPrimaryButton>
        </Flex>
      </Flex>
    </Modal>
  )
}
