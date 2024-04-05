import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { css } from 'styled-components'
import { FLEX_ROBOT_TYPE } from '@opentrons/shared-data'

import {
  Flex,
  Text,
  Icon,
  SPACING,
  ALIGN_CENTER,
  BORDERS,
  JUSTIFY_CENTER,
  COLORS,
  TYPOGRAPHY,
  useHoverTooltip,
  Tooltip,
  DIRECTION_COLUMN,
  Box,
} from '@opentrons/components'
import type { StyleProps } from '@opentrons/components'
import type { RobotType } from '@opentrons/shared-data'

const ARROW_STYLE = css`
  color: ${COLORS.grey50};
  cursor: pointer;
  &:hover {
    color: ${COLORS.black80};
  }
`

const ARROW_STYLE_ACTIVE = css`
  color: ${COLORS.blue50};
  cursor: pointer;
  &:hover {
    color: ${COLORS.black80};
  }
`

const ARROW_STYLE_DISABLED = css`
  color: ${COLORS.grey50};
`

interface MultiplesProps {
  numItems: number
  maxItems: number
  setValue: (num: number) => void
  isDisabled: boolean
}
interface EquipmentOptionProps extends StyleProps {
  onClick: React.MouseEventHandler
  isSelected: boolean
  text: React.ReactNode
  robotType: RobotType
  image?: React.ReactNode
  showCheckbox?: boolean
  disabled?: boolean
  multiples?: MultiplesProps
}
export function EquipmentOption(props: EquipmentOptionProps): JSX.Element {
  const {
    text,
    onClick,
    isSelected,
    image = null,
    showCheckbox = false,
    disabled = false,
    robotType,
    multiples,
    ...styleProps
  } = props
  const { t } = useTranslation(['tooltip', 'shared'])
  const [equipmentTargetProps, equipmentTooltipProps] = useHoverTooltip()
  const [tempTargetProps, tempTooltipProps] = useHoverTooltip()
  const [numMultiples, setNum] = React.useState<number>(0)

  const EQUIPMENT_OPTION_STYLE = css`
    background-color: ${COLORS.white};
    border-radius: ${BORDERS.borderRadius8};
    border: 1px ${BORDERS.styleSolid} ${COLORS.grey30};

    &:hover {
      background-color: ${multiples ? COLORS.white : COLORS.grey10};
      border: 1px ${BORDERS.styleSolid}
        ${multiples ? COLORS.grey30 : COLORS.grey35};
    }

    &:focus {
      outline: 2px ${BORDERS.styleSolid} ${COLORS.blue50};
      outline-offset: 3px;
    }
  `

  const EQUIPMENT_OPTION_SELECTED_STYLE = css`
    ${EQUIPMENT_OPTION_STYLE}
    background-color: ${COLORS.blue10};
    border: 1px ${BORDERS.styleSolid} ${COLORS.blue50};

    &:hover {
      border: 1px ${BORDERS.styleSolid} ${COLORS.blue50};
      box-shadow: 0px 1px 3px 0px rgba(0, 0, 0, 0.2);
    }
  `

  const EQUIPMENT_OPTION_DISABLED_STYLE = css`
    ${EQUIPMENT_OPTION_STYLE}
    background-color: ${COLORS.white};
    border: 1px ${BORDERS.styleSolid} ${COLORS.grey30};

    &:hover {
      border: 1px ${BORDERS.styleSolid} ${COLORS.grey30};
    }
  `

  let equipmentOptionStyle
  if (disabled) {
    equipmentOptionStyle = EQUIPMENT_OPTION_DISABLED_STYLE
  } else if (isSelected) {
    equipmentOptionStyle = EQUIPMENT_OPTION_SELECTED_STYLE
  } else {
    equipmentOptionStyle = EQUIPMENT_OPTION_STYLE
  }
  let iconInfo: JSX.Element | null = null
  if (showCheckbox && !disabled) {
    iconInfo = (
      <Icon
        aria-label={`EquipmentOption_${
          isSelected ? 'checkbox-marked' : 'checkbox-blank-outline'
        }`}
        color={isSelected ? COLORS.blue50 : COLORS.grey50}
        size="1.5rem"
        name={isSelected ? 'checkbox-marked' : 'checkbox-blank-outline'}
      />
    )
  } else if (showCheckbox && disabled) {
    iconInfo = <Flex width="1.5rem" />
  } else if (multiples != null) {
    const { numItems, maxItems, isDisabled } = multiples
    let upArrowCSS = ARROW_STYLE
    if (isDisabled || numItems === maxItems) {
      upArrowCSS = ARROW_STYLE_DISABLED
    } else if (numItems > 0) {
      upArrowCSS = ARROW_STYLE_ACTIVE
    }
    let downArrowCSS = ARROW_STYLE
    if (numItems === 0) {
      downArrowCSS = ARROW_STYLE_DISABLED
    } else if (numItems > 0) {
      downArrowCSS = ARROW_STYLE_ACTIVE
    }

    iconInfo = (
      <Flex
        flexDirection={DIRECTION_COLUMN}
        gridGap={SPACING.spacing4}
        width="1.5rem"
        alignItems={ALIGN_CENTER}
      >
        <Flex
          {...tempTargetProps}
          data-testid="EquipmentOption_upArrow"
          onClick={
            numMultiples === 7
              ? undefined
              : () => {
                  multiples.setValue(numMultiples + 1)
                  setNum(numMultiples + 1)
                }
          }
        >
          <Icon css={upArrowCSS} size={SPACING.spacing12} name="ot-arrow-up" />
        </Flex>
        <Flex
          data-testid="EquipmentOption_downArrow"
          onClick={
            numMultiples === 0
              ? undefined
              : () => {
                  multiples.setValue(numMultiples - 1)
                  setNum(numMultiples - 1)
                }
          }
        >
          <Icon
            css={downArrowCSS}
            size={SPACING.spacing12}
            name="ot-arrow-down"
          />
        </Flex>
        {isDisabled || numMultiples === 7 ? (
          <Tooltip {...tempTooltipProps}>
            {t('not_enough_space_for_temp')}
          </Tooltip>
        ) : null}
      </Flex>
    )
  }

  return (
    <>
      <Flex
        aria-label={`EquipmentOption_flex_${text}`}
        alignItems={ALIGN_CENTER}
        width="21.75rem"
        padding={SPACING.spacing8}
        border={
          isSelected && !disabled
            ? BORDERS.activeLineBorder
            : BORDERS.lineBorder
        }
        borderRadius={BORDERS.borderRadius8}
        cursor={disabled || multiples != null ? 'auto' : 'pointer'}
        backgroundColor={disabled ? COLORS.grey30 : COLORS.transparent}
        onClick={disabled ? undefined : onClick}
        {...styleProps}
        {...equipmentTargetProps}
        css={equipmentOptionStyle}
      >
        {iconInfo}
        <Flex
          css={css`
            user-select: none;
          `}
          justifyContent={JUSTIFY_CENTER}
          alignItems={ALIGN_CENTER}
          marginRight={SPACING.spacing16}
        >
          {image}
        </Flex>
        <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing4}>
          <Text
            css={css`
              user-select: none;
            `}
            as="p"
            fontSize={TYPOGRAPHY.fontSizeP}
            color={disabled ? COLORS.grey50 : COLORS.black90}
          >
            {text}
          </Text>
          {multiples != null ? (
            <>
              <Box borderBottom={BORDERS.lineBorder} data-testid="line" />
              <Flex
                alignItems={ALIGN_CENTER}
                justifyContent={JUSTIFY_CENTER}
                fontSize={TYPOGRAPHY.fontSizeP}
                gridGap={SPACING.spacing4}
              >
                <Text>{t('shared:amount')}</Text>
                <Text>{multiples.numItems}</Text>
              </Flex>
            </>
          ) : null}
        </Flex>
      </Flex>
      {disabled ? (
        <Tooltip {...equipmentTooltipProps}>
          {t(
            robotType === FLEX_ROBOT_TYPE
              ? 'disabled_no_space_additional_items'
              : 'disabled_you_can_add_one_type'
          )}
        </Tooltip>
      ) : null}
    </>
  )
}
