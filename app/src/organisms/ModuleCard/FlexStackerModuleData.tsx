import { useTranslation } from 'react-i18next'
import { StyledText, COLORS } from '@opentrons/components'
import { StatusLabel } from '/app/atoms/StatusLabel'

import type { FlexStackerModule } from '/app/redux/modules/types'

interface FlexStackerModuleProps {
  moduleData: FlexStackerModule['data']
}

export function FlexStackerModuleData(
  props: FlexStackerModuleProps
): JSX.Element | null {
  const { moduleData } = props
  const { t, i18n } = useTranslation(['device_details', 'shared'])

  const StatusLabelProps = {
    status: 'Idle',
    backgroundColor: COLORS.grey30,
    iconColor: COLORS.grey60,
    textColor: COLORS.grey60,
    pulse: false,
  }
  switch (moduleData.status) {
    case 'storing':
    case 'dispensing': {
      StatusLabelProps.status = moduleData.status
      StatusLabelProps.backgroundColor = COLORS.blue30
      StatusLabelProps.iconColor = COLORS.blue60
      StatusLabelProps.textColor = COLORS.blue60
      break
    }
    case 'error': {
      StatusLabelProps.status = 'Error'
      StatusLabelProps.backgroundColor = COLORS.yellow30
      StatusLabelProps.iconColor = COLORS.yellow60
      StatusLabelProps.textColor = COLORS.yellow60
      break
    }
  }
  const lidDisplayStatus =
    moduleData.hopperDoorState === 'closed'
      ? i18n.format(t('shared:closed'), 'capitalize')
      : i18n.format(t('shared:open'), 'capitalize')
  return (
    <>
      <StatusLabel {...StatusLabelProps} />
      <StyledText
        desktopStyle="bodyDefaultRegular"
        data-testid="stacker_module_data"
      >
        {t('flex_stacker_door_status', {
          status: lidDisplayStatus,
        })}
      </StyledText>
    </>
  )
}
