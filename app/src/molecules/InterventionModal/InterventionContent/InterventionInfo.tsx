import { css } from 'styled-components'

import {
  DeckInfoLabel,
  Flex,
  Icon,
  COLORS,
  BORDERS,
  SPACING,
  DIRECTION_COLUMN,
  StyledText,
  ALIGN_CENTER,
  RESPONSIVENESS,
  Tag,
  SPACING_1,
  SPACING_2,
  TYPOGRAPHY,
} from '@opentrons/components'
import { Divider } from '/app/atoms/structure/Divider'

import type { DeckInfoLabelProps } from '@opentrons/components'

export interface InterventionInfoDefaultProps {
  layout: 'default'
  type: 'location-arrow-location' | 'location-colon-location' | 'location'
  labwareName: string
  labwareNickname?: string
  currentLocationProps: DeckInfoLabelProps
  newLocationProps?: DeckInfoLabelProps
}

export interface InterventionInfoStackedProps
  extends Omit<InterventionInfoDefaultProps, 'layout'> {
  layout: 'stacked'
  subText: string
  tagText: string
}

export type InterventionInfoProps =
  | InterventionInfoDefaultProps
  | InterventionInfoStackedProps

export function InterventionInfo(props: InterventionInfoProps): JSX.Element {
  const content = buildContent(props)

  return (
    <Flex
      flexDirection={DIRECTION_COLUMN}
      padding={SPACING.spacing16}
      css={CARD_STYLE}
    >
      <Flex flexDirection={DIRECTION_COLUMN}>
        <StyledText
          oddStyle="bodyTextBold"
          desktopStyle="bodyDefaultSemiBold"
          css={LINE_CLAMP_STYLE}
        >
          {props.labwareNickname ?? props.labwareName}
        </StyledText>
        {props.layout === 'stacked' ? (
          <>
            <StyledText
              oddStyle="hidden"
              desktopStyle="bodyDefaultRegular"
              color={COLORS.grey60}
              css={css`
                ${LINE_CLAMP_STYLE}
                margin: 0.125rem 0 ${SPACING_2} 0;
                @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
                  font-size: ${TYPOGRAPHY.fontSize22};
                  margin: ${SPACING_1} 0 ${SPACING_2} 0;
                }
              `}
            >
              {props.subText}
            </StyledText>
            <Tag type="default" text={props.tagText} shrinkToContent={true} />
            <Divider
              borderColor={COLORS.grey35}
              css={`
                margin: ${SPACING_2} 0 0 0;
                @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
                  border-bottom-color: ${COLORS.grey60};
                }
              `}
            />
          </>
        ) : null}
      </Flex>
      {content}
    </Flex>
  )
}

const buildContent = (props: InterventionInfoProps): JSX.Element => {
  switch (props.type) {
    case 'location-arrow-location':
      return buildLocArrowLoc(props)
    case 'location-colon-location':
      return buildLocColonLoc(props)
    case 'location':
      return buildLoc(props)
  }
}

const buildLocArrowLoc = (props: InterventionInfoProps): JSX.Element => {
  const { currentLocationProps, newLocationProps, type } = props

  if (newLocationProps != null) {
    return (
      <Flex
        alignItems={ALIGN_CENTER}
        css={`
          gap: ${SPACING.spacing4};
          @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
            gap: ${SPACING.spacing8};
          }
        `}
      >
        <DeckInfoLabel {...currentLocationProps} />
        <Icon name="arrow-right" css={ICON_STYLE} />
        <DeckInfoLabel {...newLocationProps} />
      </Flex>
    )
  } else {
    console.error(
      `InterventionInfo type is ${type}, but no newLocation was specified.`
    )
    return buildLoc(props)
  }
}

const buildLoc = ({
  currentLocationProps,
}: InterventionInfoProps): JSX.Element => {
  return (
    <Flex gridGap={SPACING.spacing8}>
      <DeckInfoLabel {...currentLocationProps} />
    </Flex>
  )
}

const buildLocColonLoc = (props: InterventionInfoProps): JSX.Element => {
  const { currentLocationProps, newLocationProps, type } = props

  if (newLocationProps != null) {
    return (
      <Flex
        alignItems={ALIGN_CENTER}
        css={`
          gap: ${SPACING.spacing4};
          @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
            gap: ${SPACING.spacing8};
          }
        `}
      >
        <DeckInfoLabel {...currentLocationProps} />
        <Icon name="colon" css={ICON_STYLE} />
        <DeckInfoLabel {...newLocationProps} />
      </Flex>
    )
  } else {
    console.error(
      `InterventionInfo type is ${type}, but no newLocation was specified.`
    )
    return buildLoc(props)
  }
}

const ICON_STYLE = css`
  width: ${SPACING.spacing24};
  height: ${SPACING.spacing24};
  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    width: ${SPACING.spacing40};
    height: ${SPACING.spacing40};
  }
`

const CARD_STYLE = css`
  background-color: ${COLORS.grey20};
  border-radius: ${BORDERS.borderRadius4};
  gap: ${SPACING.spacing8};
  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    background-color: ${COLORS.grey35};
    border-radius: ${BORDERS.borderRadius8};
  }
`

const LINE_CLAMP_STYLE = css`
  display: -webkit-box;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  word-wrap: break-word;
  -webkit-line-clamp: 2;
`
