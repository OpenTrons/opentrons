import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { css } from 'styled-components'

import {
  BORDERS,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  POSITION_FIXED,
  SPACING,
  TYPOGRAPHY,
} from '@opentrons/components'

import { StyledText } from '../../atoms/text'
import { InputField } from '../../atoms/InputField'
import { NormalKeyboard } from '../../atoms/SoftwareKeyboard'
import { useIsUnboxingFlowOngoing } from '../RobotSettingsDashboard/NetworkSettings/hooks'

const SSID_INPUT_FIELD_STYLE = css`
  padding-top: 2.125rem;
  padding-bottom: 2.125rem;
  height: 4.25rem;
  font-size: ${TYPOGRAPHY.fontSize28};
  line-height: ${TYPOGRAPHY.lineHeight36};
  font-weight: ${TYPOGRAPHY.fontWeightRegular};
  color: ${COLORS.black90};
  padding-left: ${SPACING.spacing24};
  box-sizing: border-box;

  &:focus {
    border: 3px solid ${COLORS.blue50};
    filter: drop-shadow(0px 0px 10px ${COLORS.blue50});
    border-radius: ${BORDERS.borderRadius4};
  }
`

interface SetWifiSsidProps {
  errorMessage?: string | null
  inputSsid: string
  setInputSsid: React.Dispatch<React.SetStateAction<string>>
}

export function SetWifiSsid({
  errorMessage,
  inputSsid,
  setInputSsid,
}: SetWifiSsidProps): JSX.Element {
  const { t } = useTranslation(['device_settings', 'shared'])
  const keyboardRef = React.useRef(null)
  const isUnboxingFlowOngoing = useIsUnboxingFlowOngoing()

  return (
    <>
      <Flex
        flexDirection={DIRECTION_COLUMN}
        paddingX="6.34375rem"
        gridGap={SPACING.spacing8}
        marginTop={isUnboxingFlowOngoing ? undefined : '7.75rem'}
      >
        <StyledText
          as="p"
          fontWeight={TYPOGRAPHY.fontWeightRegular}
          color={errorMessage != null ? COLORS.red50 : COLORS.black90}
        >
          {t('enter_network_name')}
        </StyledText>
        <InputField
          aria-label="wifi_ssid"
          value={inputSsid}
          onChange={e => setInputSsid(e.target.value)}
          type="text"
          css={SSID_INPUT_FIELD_STYLE}
          error={errorMessage}
        />
      </Flex>
      <Flex width="100%" position={POSITION_FIXED} left="0" bottom="0">
        <NormalKeyboard
          onChange={e => e != null && setInputSsid(String(e))}
          keyboardRef={keyboardRef}
        />
      </Flex>
    </>
  )
}
