import {
  ALIGN_CENTER,
  BORDERS,
  COLORS,
  DIRECTION_ROW,
  Flex,
  Tag,
  Icon,
  JUSTIFY_SPACE_BETWEEN,
  SPACING,
  LegacyStyledText,
  TYPOGRAPHY,
} from '@opentrons/components'
import type { OddModalHeaderBaseProps } from './types'

export function OddModalHeader(props: OddModalHeaderBaseProps): JSX.Element {
  const {
    title,
    hasExitIcon,
    iconName,
    iconColor,
    tagText,
    onClick,
    ...styleProps
  } = props
  return (
    <Flex
      backgroundColor={COLORS.white}
      color={COLORS.black90}
      height="6.25rem"
      width="100%"
      padding={SPACING.spacing32}
      flexDirection={DIRECTION_ROW}
      justifyContent={JUSTIFY_SPACE_BETWEEN}
      alignItems={ALIGN_CENTER}
      borderRadius={`${BORDERS.borderRadius12} ${BORDERS.borderRadius12} 0px 0px`}
      {...styleProps}
    >
      <Flex flexDirection={DIRECTION_ROW} gridGap={SPACING.spacing16}>
        {iconName != null && iconColor != null ? (
          <Icon
            aria-label={`icon_${iconName}`}
            name={iconName}
            color={iconColor}
            size="2rem"
            alignSelf={ALIGN_CENTER}
          />
        ) : null}
        {tagText != null ? <Tag type="default" text={tagText} /> : null}
        <LegacyStyledText
          fontWeight={TYPOGRAPHY.fontWeightBold}
          fontSize={TYPOGRAPHY.fontSize28}
          lineHeight={TYPOGRAPHY.lineHeight36}
        >
          {title}
        </LegacyStyledText>
      </Flex>
      {hasExitIcon && onClick != null ? (
        <Flex
          onClick={onClick}
          aria-label="closeIcon"
          alignItems={ALIGN_CENTER}
        >
          <Icon size="3.5rem" name="ot-close" />
        </Flex>
      ) : null}
    </Flex>
  )
}
