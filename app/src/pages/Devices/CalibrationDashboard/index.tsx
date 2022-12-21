import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { useHistory, useParams } from 'react-router-dom'

import { COLORS } from '@opentrons/components'

import { Modal } from '../../../molecules/Modal'
import type { DesktopRouteParams } from '../../../App/types'

export function CalibrationDashboard(): JSX.Element {
  const { t } = useTranslation('robot_calibration')
  const history = useHistory()
  const { robotName } = useParams<DesktopRouteParams>()

  return (
    <Modal
      title={`${robotName} ${t('calibration_dashboard')}`}
      onClose={() =>
        history.push(`/devices/${robotName}/robot-settings/calibration`)
      }
      fullPage
      backgroundColor={COLORS.fundamentalsBackground}
    >
      calibration task list
    </Modal>
  )
}
