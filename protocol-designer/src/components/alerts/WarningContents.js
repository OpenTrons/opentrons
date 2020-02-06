// @flow
import * as React from 'react'
import i18n from '../../localization'
import { START_TERMINAL_ITEM_ID } from '../../steplist'
import type { AlertLevel } from './types'
import { TerminalItemLink } from '../steplist/TerminalItem'

type WarningContentsProps = {
  warningType: string,
  level: AlertLevel,
}
const WarningContents = (props: WarningContentsProps) => {
  if (props.level === 'timeline') {
    switch (props.warningType) {
      case 'ASPIRATE_FROM_PRISTINE_WELL':
        return (
          <React.Fragment>
            {i18n.t(`alert.timeline.warning.${props.warningType}.body`, {
              defaultValue: '',
            })}
            <TerminalItemLink terminalId={START_TERMINAL_ITEM_ID} />
          </React.Fragment>
        )
      default:
        return (
          <React.Fragment>
            {i18n.t(`alert.timeline.warning.${props.warningType}.body`, {
              defaultValue: '',
            })}
          </React.Fragment>
        )
    }
  } else if (props.level === 'form') {
    return (
      <React.Fragment>
        {i18n.t(`alert.form.warning.${props.warningType}.body`, {
          defaultValue: '',
        })}
      </React.Fragment>
    )
  } else {
    return null
  }
}

export default WarningContents
