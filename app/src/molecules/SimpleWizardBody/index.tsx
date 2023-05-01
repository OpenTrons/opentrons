import * as React from 'react'
import { useSelector } from 'react-redux'
import { css } from 'styled-components'
import {
  DIRECTION_COLUMN,
  Flex,
  Icon,
  JUSTIFY_FLEX_END,
  JUSTIFY_CENTER,
  SPACING,
  TYPOGRAPHY,
  RESPONSIVENESS,
  ALIGN_CENTER,
  StyleProps,
  JUSTIFY_SPACE_BETWEEN,
} from '@opentrons/components'
import { getIsOnDevice } from '../../redux/config'
import { StyledText } from '../../atoms/text'
import { Skeleton } from '../../atoms/Skeleton'

interface Props extends StyleProps {
  iconColor: string
  header: string
  isSuccess: boolean
  children?: React.ReactNode
  subHeader?: string
  isPending?: boolean
}
const BACKGROUND_SIZE = '47rem'

const HEADER_STYLE = css`
  ${TYPOGRAPHY.h1Default};
  margin-top: ${SPACING.spacing5};
  margin-bottom: ${SPACING.spacing3};

  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    font-size: 2rem;
    font-weight: 700;
  }
`
const SUBHEADER_STYLE = css`
  ${TYPOGRAPHY.pRegular};
  margin-left: 6.25rem;
  margin-right: 6.25rem;
  text-align: ${TYPOGRAPHY.textAlignCenter};
  height: 1.75rem;

  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    font-size: ${TYPOGRAPHY.fontSize28};
    line-height: ${TYPOGRAPHY.lineHeight36};
    margin-left: 4.5rem;
    margin-right: 4.5rem;
  }
`
const BUTTON_STYLE = css`
  justify-content: ${JUSTIFY_FLEX_END};
  padding-right: ${SPACING.spacing6};
  padding-bottom: ${SPACING.spacing6};

  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    padding-bottom: ${SPACING.spacing6};
  }
`

export function SimpleWizardBody(props: Props): JSX.Element {
  const {
    iconColor,
    children,
    header,
    subHeader,
    isSuccess,
    isPending,
    ...styleProps
  } = props
  const isOnDevice = useSelector(getIsOnDevice)

  return (
    <Flex
      height={isOnDevice ? '472px' : 'auto'}
      flexDirection={DIRECTION_COLUMN}
      justifyContent={JUSTIFY_SPACE_BETWEEN}
      {...styleProps}
    >
      <Flex
        alignItems={ALIGN_CENTER}
        justifyContent={JUSTIFY_CENTER}
        flexDirection={DIRECTION_COLUMN}
        flex="1 0 auto"
      >
        {isPending ? (
          <Flex
            gridGap={SPACING.spacing5}
            flexDirection={DIRECTION_COLUMN}
            justifyContent={JUSTIFY_CENTER}
          >
            <Skeleton
              width="6.25rem"
              height="6.25rem"
              backgroundSize={BACKGROUND_SIZE}
            />
            <Skeleton
              width="18rem"
              height="1.125rem"
              backgroundSize={BACKGROUND_SIZE}
            />
          </Flex>
        ) : (
          <>
            <Icon
              name={isSuccess ? 'ot-check' : 'ot-alert'}
              size={isOnDevice ? '11.25rem' : '2.5rem'}
              color={iconColor}
              aria-label={isSuccess ? 'ot-check' : 'ot-alert'}
            />
            <StyledText css={HEADER_STYLE}>{header}</StyledText>
            {subHeader != null ? (
              <StyledText css={SUBHEADER_STYLE}>{subHeader}</StyledText>
            ) : (
              <Flex
                aria-label="flex_spacing"
                height={isOnDevice ? '0rem' : '1.75rem'}
              />
            )}
          </>
        )}
      </Flex>
      <Flex flex="0 1 auto" css={BUTTON_STYLE}>
        {children}
      </Flex>
    </Flex>
  )
}
