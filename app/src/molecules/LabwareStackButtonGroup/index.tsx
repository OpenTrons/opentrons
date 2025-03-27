import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { css } from 'styled-components'
import {
  ALIGN_CENTER,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  StyledText,
  Tag,
  RadioButton,
  truncateString,
  SPACING,
  styleProps,
} from '@opentrons/components'
import { getIsOnDevice } from '/app/redux/config'

import type { Dispatch, SetStateAction } from 'react'
import type { StyleProps } from '@opentrons/components'
import type { LabwareInStack } from '/app/transformations/commands'

const HIDE_SCROLLBAR = css`
  ::-webkit-scrollbar {
    display: none;
  }
`
const RADIO_BUTTON = css`
  word-break: keep-all;
`

const MAX_CHARS_FOR_DISPLAY_NAME_ODD = 44
const MAX_CHARS_FOR_DISPLAY_NAME_DESKTOP = 30

interface LabwareStackButtonGroupProps extends StyleProps {
  labwareInStack: LabwareInStack[]
  selectedLabware: LabwareInStack
  setSelectedLabware: Dispatch<SetStateAction<LabwareInStack>>
}

export function LabwareStackButtonGroup(
  props: LabwareStackButtonGroupProps
): JSX.Element {
  const { labwareInStack, selectedLabware, setSelectedLabware } = props
  const isOnDevice = useSelector(getIsOnDevice)
  const { t } = useTranslation('protocol_setup')
  const MAX_CHARS = isOnDevice
    ? MAX_CHARS_FOR_DISPLAY_NAME_ODD
    : MAX_CHARS_FOR_DISPLAY_NAME_DESKTOP
  return (
    <Flex
      flexDirection={DIRECTION_COLUMN}
      css={HIDE_SCROLLBAR}
      overflowY="scroll"
      height="27rem"
      width={isOnDevice ? '21.875rem' : '11.688rem'}
      gridGap={SPACING.spacing8}
      {...styleProps}
    >
      <StyledText
        oddStyle="smallBodyTextRegular"
        desktopStyle="captionRegular"
        color={COLORS.grey60}
      >
        {t('top_of_slot')}
      </StyledText>
      {labwareInStack.map((labware, index) => {
        const isSelected = selectedLabware.labwareId === labware.labwareId
        const label = (
          <Flex
            gridGap={SPACING.spacing16}
            alignItems={ALIGN_CENTER}
            css={RADIO_BUTTON}
          >
            <Tag
              type={isSelected ? 'onColor' : 'default'}
              text={(labwareInStack.length - index).toString()}
            />
            <StyledText
              oddStyle="bodyTextRegular"
              desktopStyle="bodyDefaultRegular"
              wordBreak="keep-all"
            >
              {truncateString(labware.displayName, MAX_CHARS)}
            </StyledText>
          </Flex>
        )
        return (
          <RadioButton
            key={index}
            radioButtonType="small"
            buttonLabel={label}
            buttonValue={index}
            isSelected={isSelected}
            maxLines={2}
            onChange={() => {
              setSelectedLabware(labware)
            }}
            largeDesktopBorderRadius={!isOnDevice}
          />
        )
      })}
      <StyledText
        oddStyle="smallBodyTextRegular"
        desktopStyle="captionRegular"
        color={COLORS.grey60}
      >
        {t('bottom_of_slot')}
      </StyledText>
    </Flex>
  )
}
