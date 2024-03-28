import * as React from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { StyledText } from '@opentrons/components'
import * as Sessions from '../../../redux/sessions'

import type { SessionType } from '../../../redux/sessions/types'

interface BodyProps {
  sessionType: SessionType
}
export function Body(props: BodyProps): JSX.Element | null {
  const { sessionType } = props
  const { t } = useTranslation('robot_calibration')
  switch (sessionType) {
    case Sessions.SESSION_TYPE_CALIBRATION_HEALTH_CHECK:
      return (
        <Trans
          t={t}
          i18nKey="calibration_health_check_intro_body"
          components={{ block: <StyledText as="p" /> }}
        />
      )
    case Sessions.SESSION_TYPE_DECK_CALIBRATION:
      return <StyledText as="p">{t('deck_calibration_intro_body')}</StyledText>
    case Sessions.SESSION_TYPE_PIPETTE_OFFSET_CALIBRATION:
      return (
        <StyledText as="p">
          {t('pipette_offset_calibration_intro_body')}
        </StyledText>
      )
    case Sessions.SESSION_TYPE_TIP_LENGTH_CALIBRATION:
      return (
        <StyledText as="p">{t('tip_length_calibration_intro_body')}</StyledText>
      )
    default:
      // this case should never be reached
      console.warn(
        'Introduction Calibration Panel received invalid session type'
      )
      return null
  }
}
