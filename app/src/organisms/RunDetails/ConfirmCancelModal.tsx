import * as React from 'react'
import { useTranslation } from 'react-i18next'
import {
  AlertModal,
  NewPrimaryBtn,
  NewSecondaryBtn,
  SPACING_3,
} from '@opentrons/components'
import { useStopRunMutation } from '@opentrons/react-api-client'

import { Portal } from '../../App/portal'
import { useTrackEvent } from '../../redux/analytics'
import { useProtocolRunAnalyticsData } from '../Devices/hooks'

export interface ConfirmCancelModalProps {
  onClose: () => unknown
  runId: string | null
}

export function ConfirmCancelModal(
  props: ConfirmCancelModalProps
): JSX.Element {
  const { onClose, runId } = props
  const { stopRun } = useStopRunMutation()
  const { getProtocolRunAnalyticsData } = useProtocolRunAnalyticsData(runId)
  const { t } = useTranslation('run_details')
  const trackEvent = useTrackEvent()

  const cancel: React.MouseEventHandler<HTMLButtonElement> = async (
    e
  ): Promise<void> => {
    e.preventDefault()
    e.stopPropagation()
    onClose()

    if (runId != null) {
      stopRun(runId)

      try {
        const {
          protocolRunAnalyticsData,
          runTime,
        } = await getProtocolRunAnalyticsData()

        trackEvent({
          name: 'runCancel',
          properties: {
            ...protocolRunAnalyticsData,
            runTime,
          },
        })
      } catch (e) {
        console.error(
          `getProtocolRunAnalyticsData error during runCancel: ${
            (e as Error).message
          }; sending event without protocol properties`
        )

        trackEvent({
          name: 'runCancel',
          properties: {},
        })
      }
    }
  }

  return (
    <Portal>
      <AlertModal
        heading={t('cancel_run_modal_heading')}
        buttons={[
          {
            Component: () => (
              <NewSecondaryBtn onClick={onClose}>
                {t('cancel_run_modal_back')}
              </NewSecondaryBtn>
            ),
          },
          {
            Component: () => (
              <NewPrimaryBtn onClick={cancel} marginLeft={SPACING_3}>
                {t('cancel_run_modal_confirm')}
              </NewPrimaryBtn>
            ),
          },
        ]}
        alertOverlay
      >
        <p>{t('cancel_run_alert_info')}</p>
        <p>{t('cancel_run_module_info')}</p>
      </AlertModal>
    </Portal>
  )
}
