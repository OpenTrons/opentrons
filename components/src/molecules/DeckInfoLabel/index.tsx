import styled from 'styled-components'

import { StyledText } from '../../atoms'
import { BORDERS, COLORS } from '../../helix-design-system'
import { Icon } from '../../icons'
import { Flex } from '../../primitives'
import { ALIGN_CENTER, JUSTIFY_CENTER } from '../../styles'
import { RESPONSIVENESS, SPACING } from '../../ui-style-constants'

import type { IconName, ModuleIconName } from '../../icons'
import type { StyleProps } from '../../primitives'

interface DeckLabelProps extends StyleProps {
  /** deck label to display */
  deckLabel: string
  iconName?: IconName
}

interface HardwareIconProps extends StyleProps {
  /** hardware icon name */
  iconName: ModuleIconName | 'stacked'
  deckLabel?: string
}

// type union requires one of deckLabel or iconName, but not both
export type DeckInfoLabelProps = (DeckLabelProps | HardwareIconProps) & {
  highlight?: boolean
  svgSize?: string | number
}

export const DeckInfoLabel = styled(DeckInfoLabelComponent)`
  align-items: ${ALIGN_CENTER};
  background-color: ${props =>
    props.highlight ?? false ? COLORS.blue50 : 'inherit'};
  border: 1px solid
    ${props => (props.highlight ?? false ? 'transparent' : COLORS.black90)};
  width: ${props => props.width ?? 'max-content'};
  padding: ${SPACING.spacing2} ${SPACING.spacing4};
  border-radius: ${BORDERS.borderRadius8};
  justify-content: ${JUSTIFY_CENTER};
  height: ${props =>
    props.height ?? SPACING.spacing20}; // prevents the icon from being squished

  > svg {
    height: ${props => props.svgSize ?? '0.875rem'};
    width: ${props => props.svgSize ?? '0.875rem'};
  }

  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    border-width: 2px;
    border-radius: ${BORDERS.borderRadius12};
    height: ${props => props.height ?? SPACING.spacing32};
    padding: ${SPACING.spacing4}
      ${props =>
        props.deckLabel != null ? SPACING.spacing8 : SPACING.spacing6};
    > svg {
      height: ${props => props.svgSize ?? '1.25rem'};
      width: ${props => props.svgSize ?? '1.25rem'};
    }
  }
`

function DeckInfoLabelComponent({
  deckLabel,
  iconName,
  highlight = false,
  ...styleProps
}: DeckInfoLabelProps): JSX.Element {
  return (
    <Flex
      data-testid={
        deckLabel != null
          ? `DeckInfoLabel_${deckLabel}`
          : `DeckInfoLabel_${iconName}`
      }
      {...styleProps}
    >
      {iconName != null ? (
        <Icon
          name={iconName}
          color={highlight ? COLORS.white : COLORS.black90}
          aria-label={iconName}
        />
      ) : (
        <StyledText
          desktopStyle="captionBold"
          oddStyle="smallBodyTextBold"
          color={highlight ? COLORS.white : COLORS.black90}
        >
          {deckLabel}
        </StyledText>
      )}
    </Flex>
  )
}
