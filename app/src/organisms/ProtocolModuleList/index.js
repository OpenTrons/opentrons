// @flow
import * as React from 'react'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'

import {
  useHoverTooltip,
  Flex,
  Icon,
  ListItem,
  Text,
  TitledList,
  Tooltip,
  C_MED_GRAY,
  FONT_SIZE_CAPTION,
  FONT_WEIGHT_SEMIBOLD,
  FONT_BODY_1_DARK,
  SPACING_1,
  SPACING_2,
  SPACING_4,
  TEXT_TRANSFORM_UPPERCASE,
  Box,
  JUSTIFY_SPACE_BETWEEN,
} from '@opentrons/components'
import { getModuleDisplayName } from '@opentrons/shared-data'
import { selectors as robotSelectors } from '../../redux/robot'
import { getMatchedModules } from '../../redux/modules'
import styles from './styles.css'

import type { MatchedModule } from '../../redux/modules/types'
import type { State } from '../../redux/types'

const MODULE_STYLE = { width: '37%' }
const USB_ORDER_STYLE = { width: '27%', paddingRight: '0.75rem' }
const USB_PORT_STYLE = { width: '23%', paddingRight: '0.75rem' }
const DECK_SLOT_STYLE = { width: '13%' }

export function ProtocolModuleList(): React.Node {
  const { t } = useTranslation('protocol_calibration')
  const modulesRequired = useSelector((state: State) =>
    robotSelectors.getModules(state)
  )
  const matched = useSelector((state: State) => getMatchedModules(state))
  const hasDuplicateModule = useSelector((state: State) =>
    Object.values(robotSelectors.getModulesByModel(state)).some(
      m => Array.isArray(m) && m.length > 1
    )
  )

  if (modulesRequired.length < 1) return null
  return (
    <TitledList key={t('modules_title')} title={t('modules_title')}>
      <Text
        css={FONT_BODY_1_DARK}
        paddingLeft="0.75rem"
        paddingRight={SPACING_4}
      >
        {t('module_connect_instruction')}
      </Text>
      <Flex
        color={C_MED_GRAY}
        fontSize={FONT_SIZE_CAPTION}
        fontWeight={FONT_WEIGHT_SEMIBOLD}
        textTransform={TEXT_TRANSFORM_UPPERCASE}
        marginY={SPACING_2}
        paddingX="0.875rem"
        justifyContent={!hasDuplicateModule ? JUSTIFY_SPACE_BETWEEN : null}
      >
        <Text {...MODULE_STYLE}>{t('modules_module_title')}</Text>
        {hasDuplicateModule && (
          <Text {...USB_ORDER_STYLE}>{t('modules_usb_order_title')}</Text>
        )}
        <Text {...USB_PORT_STYLE}>{t('modules_usb_port_title')}</Text>
        <Text {...DECK_SLOT_STYLE}>{t('modules_deck_slot_title')}</Text>
      </Flex>
      <ListItem
        key={'module'}
        url={`/calibrate/modules`}
        className={styles.module_list_item}
        activeClassName={styles.active}
      >
        <Box width="100%">
          {modulesRequired.map(m => (
            <Flex
              key={m.slot}
              data-test={m.slot}
              padding="0.75rem"
              justifyContent={
                !hasDuplicateModule ? JUSTIFY_SPACE_BETWEEN : null
              }
            >
              <Text {...MODULE_STYLE}>{getModuleDisplayName(m.model)}</Text>
              {hasDuplicateModule && (
                <Text {...USB_ORDER_STYLE}>{m.protocolLoadOrder + 1}</Text>
              )}
              <Flex {...USB_PORT_STYLE}>
                <UsbPortInfo
                  matchedModule={matched.find(a => a.slot === m.slot) || null}
                />
              </Flex>
              <Text {...DECK_SLOT_STYLE}>{`Slot ${m.slot}`}</Text>
            </Flex>
          ))}
        </Box>
      </ListItem>
    </TitledList>
  )
}

type UsbPortInfoProps = {|
  matchedModule: MatchedModule | null,
|}

function UsbPortInfo(props: UsbPortInfoProps): React.Node {
  const [targetProps, tooltipProps] = useHoverTooltip()
  const { t } = useTranslation('protocol_calibration')

  // return nothing if module is missing
  if (props.matchedModule === null) return null
  const portInfo = props.matchedModule.module.usbPort
  const portText = portInfo?.hub
    ? `Port ${portInfo.hub} via Hub`
    : portInfo?.port
    ? `Port ${portInfo.port}`
    : 'N/A'
  return (
    <>
      <Text>{portText}</Text>
      {portText === 'N/A' && (
        <Flex {...targetProps}>
          <Icon
            name="alert-circle"
            height="15px"
            width={'15px'}
            paddingLeft={SPACING_1}
          />
          <Tooltip style={{ width: '2rem' }} {...tooltipProps}>
            {t('modules_update_software_tooltip')}
          </Tooltip>
        </Flex>
      )}
    </>
  )
}
