import * as React from 'react'
import styled from 'styled-components'
import {
  ALIGN_CENTER,
  Flex,
  SPACING,
  TEXT_TRANSFORM_CAPITALIZE,
  TYPOGRAPHY,
  COLORS,
  JUSTIFY_SPACE_BETWEEN,
  Icon,
  DIRECTION_COLUMN,
  ALIGN_FLEX_START,
  BORDERS,
} from '@opentrons/components'
import type { Mount } from '../../redux/pipettes/types'
import { StyledText } from '../../atoms/text'
import { useTranslation } from 'react-i18next'

const MountButton = styled.button<{ isAttached: boolean }>`
  display: flex;
  width: 100%;
  flex-direction: ${DIRECTION_COLUMN};
  align-items: ${ALIGN_FLEX_START};
  padding: ${SPACING.spacing5};
  border-radius: ${BORDERS.size_three};
  background-color: ${({ isAttached }) =>
    isAttached ? COLORS.green_three : COLORS.light_one};
  &:hover,
  &:active,
  &:focus {
    background-color: ${({ isAttached }) =>
      isAttached ? COLORS.green_three_pressed : COLORS.light_one_pressed};
  }
`
interface LabeledMountProps {
  mount: Mount | 'extension'
  instrumentName: string | null
  handleClick: React.MouseEventHandler
}

export function LabeledMount(props: LabeledMountProps): JSX.Element {
  const { t } = useTranslation('device_details')
  const { mount, instrumentName, handleClick } = props

  return (
    <MountButton onClick={handleClick} isAttached={instrumentName != null}>
      <Flex
        width="100%"
        justifyContent={JUSTIFY_SPACE_BETWEEN}
        alignItems={ALIGN_CENTER}
      >
        <Flex
          flex="1 0 auto"
          alignItems={ALIGN_CENTER}
          gridGap={SPACING.spacing5}
        >
          <StyledText
            flex="2"
            as="h4"
            fontWeight={TYPOGRAPHY.fontWeightSemiBold}
            textAlign={TYPOGRAPHY.textAlignLeft}
            textTransform={TEXT_TRANSFORM_CAPITALIZE}
            fontSize={TYPOGRAPHY.fontSize28}
          >
            {t('mount', { side: mount })}
          </StyledText>
          <StyledText
            flex="5"
            as="h4"
            color={COLORS.darkBlack_seventy}
            textAlign={TYPOGRAPHY.textAlignLeft}
            fontWeight={TYPOGRAPHY.fontWeightRegular}
            fontSize={TYPOGRAPHY.fontSize28}
          >
            {instrumentName == null ? t('empty') : instrumentName}
          </StyledText>
        </Flex>
        <Icon name="more" size="1.5rem" />
      </Flex>
    </MountButton>
  )
}
