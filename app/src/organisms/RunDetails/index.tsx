import * as React from 'react'
import { useTranslation } from 'react-i18next'
import {
  Flex,
  PrimaryBtn,
  Text,
  BORDER_WIDTH_DEFAULT,
  C_BLUE,
  C_WHITE,
  DIRECTION_COLUMN,
  FONT_WEIGHT_SEMIBOLD,
  LINE_HEIGHT_SOLID,
  SPACING_2,
  SPACING_3,
  useConditionalConfirm,
} from '@opentrons/components'
import { Page } from '../../atoms/Page'
import { useProtocolDetails } from './hooks'
import { ConfirmCancelModal } from '../../pages/Run/RunLog'

export function RunDetails(): JSX.Element | null {
  const { t } = useTranslation('run_details')
  const { displayName, protocolData } = useProtocolDetails()
  const {
    showConfirmation: showConfirmExit,
    confirm: confirmExit,
    cancel: cancelExit,
  } = useConditionalConfirm(() => {}, true)
  if (protocolData == null) return null

  const cancelRunButton = (
    <PrimaryBtn
      onClick={confirmExit}
      backgroundColor={C_WHITE}
      color={C_BLUE}
      borderWidth={BORDER_WIDTH_DEFAULT}
      lineHeight={LINE_HEIGHT_SOLID}
      fontWeight={FONT_WEIGHT_SEMIBOLD}
      marginX={SPACING_3}
      paddingRight={SPACING_2}
      paddingLeft={SPACING_2}
    >
      Cancel Run
    </PrimaryBtn>
  )

  const titleBarProps = {
    title: t('protocol_title', { protocol_name: displayName }),
    rightNode: cancelRunButton,
  }

  return (
    <Page titleBarProps={titleBarProps}>
      {showConfirmExit ? <ConfirmCancelModal onClose={cancelExit} /> : null}
      <Flex flexDirection={DIRECTION_COLUMN}>
        {'commands' in protocolData
          ? protocolData.commands.map((command, index) => (
              <Flex key={index}>
                <Text>{command.command}</Text>
              </Flex>
            ))
          : null}
      </Flex>
    </Page>
  )
}
