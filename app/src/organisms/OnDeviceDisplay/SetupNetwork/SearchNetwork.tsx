import * as React from 'react'
import { useTranslation } from 'react-i18next'

import {
  Flex,
  DIRECTION_COLUMN,
  ALIGN_CENTER,
  JUSTIFY_CENTER,
  SPACING,
  TYPOGRAPHY,
  BORDERS,
} from '@opentrons/components'

import { StyledText } from '../../../atoms/text'

export function SearchNetwork(): JSX.Element {
  const { t } = useTranslation(['device_settings', 'shared'])
  return (
    <Flex
      height="22rem"
      backgroundColor="#D6D6D6"
      justifyContent={JUSTIFY_CENTER}
      borderRadius={BORDERS.size_three}
      width="100%"
    >
      <Flex
        justifyContent={JUSTIFY_CENTER}
        alignItems={ALIGN_CENTER}
        flexDirection={DIRECTION_COLUMN}
      >
        <StyledText
          fontSize="2rem"
          fontWeight={TYPOGRAPHY.fontWeightSemiBold}
          lineHeight="2.72375rem"
          marginTop={SPACING.spacing40}
        >
          {t('searching_for_networks')}
        </StyledText>
      </Flex>
    </Flex>
  )
}
