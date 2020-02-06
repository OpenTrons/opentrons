// @flow
import * as React from 'react'
import cx from 'classnames'
import { HoverTooltip } from '@opentrons/components'
import i18n from '../../localization'
import { PDListItem } from '../lists'
import { Portal } from './TooltipPortal'
import LabwareTooltipContents from './LabwareTooltipContents'
import styles from './StepItem.css'

type Props = {|
  engage: boolean,
  labwareDisplayName: ?string,
  labwareNickname: ?string,
  message?: ?string,
|}

export const MagnetStepItems = (props: Props) => (
  <>
    {props.message && <PDListItem>{props.message}</PDListItem>}
    <li className={styles.aspirate_dispense}>
      <span>{i18n.t('modules.module_long_names.magdeck')}</span>
      <span className={styles.spacer} />
      <span>{i18n.t('modules.actions.action')}</span>
    </li>
    <PDListItem
      className={cx(styles.step_subitem_column_header, styles.emphasized_cell)}
    >
      <HoverTooltip
        portal={Portal}
        tooltipComponent={
          <LabwareTooltipContents
            labwareNickname={props.labwareNickname}
            labwareDefDisplayName={props.labwareDisplayName}
          />
        }
      >
        {hoverTooltipHandlers => (
          <span
            {...hoverTooltipHandlers}
            className={styles.labware_display_name}
          >
            {props.labwareNickname}
          </span>
        )}
      </HoverTooltip>
      <span className={styles.step_subitem_spacer} />
      <span className={styles.labware_display_name}>
        {i18n.t(`modules.actions.${props.engage ? 'engage' : 'disengage'}`)}
      </span>
    </PDListItem>
  </>
)
