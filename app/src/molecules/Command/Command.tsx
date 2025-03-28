import { omit } from 'lodash'

import {
  Flex,
  JUSTIFY_CENTER,
  JUSTIFY_FLEX_START,
  ALIGN_CENTER,
  COLORS,
  BORDERS,
  SPACING,
  RESPONSIVENESS,
  CommandText,
} from '@opentrons/components'

import { CommandIcon } from './CommandIcon'
import { Skeleton } from '/app/atoms/Skeleton'

import type {
  LabwareDefinition2,
  RobotType,
  RunTimeCommand,
} from '@opentrons/shared-data'
import type { CommandTextData, StyleProps } from '@opentrons/components'

export type CommandState = NonSkeletonCommandState | 'loading'
export type NonSkeletonCommandState = 'current' | 'failed' | 'future'

interface FundamentalProps {
  robotType: RobotType
  aligned: 'left' | 'center'
  forceTwoLineClip?: boolean
}

interface SkeletonCommandProps extends FundamentalProps {
  state: 'loading'
  command: any
  commandTextData: any
}

interface NonSkeletonCommandProps extends FundamentalProps {
  state: NonSkeletonCommandState
  command: RunTimeCommand
  allRunDefs: LabwareDefinition2[]
  commandTextData: CommandTextData
}

export type CommandProps = SkeletonCommandProps | NonSkeletonCommandProps

export function Command(props: CommandProps): JSX.Element {
  // This uses the dynamic function variant to work with storybook
  const isOnDevice = RESPONSIVENESS.isTouchscreenDynamic()
  return props.state === 'loading' ? (
    <Skeleton width="100%" height={SKELETON_HEIGHT} backgroundSize="47rem" />
  ) : props.aligned === 'left' ? (
    <LeftAlignedCommand {...props} isOnDevice={isOnDevice} />
  ) : (
    <CenteredCommand {...props} isOnDevice={isOnDevice} />
  )
}

const ICON_SIZE_ODD = SPACING.spacing32
const ICON_SIZE_DESKTOP = SPACING.spacing16
const CONTAINER_Y_PADDING = SPACING.spacing12
const SKELETON_HEIGHT = '3.5rem' // spacing32 + spacing12 + spacing12, not otherwise a constant
const UNIVERSAL_CONTAINER_STYLES = {
  paddingX: SPACING.spacing24,
  paddingY: CONTAINER_Y_PADDING,
} as const

const PROPS_BY_STATE: Record<
  NonSkeletonCommandState,
  { container: { props: StyleProps; style: string }; icon: { color: string } }
> = {
  current: {
    container: {
      style: `
      border-radius: ${BORDERS.borderRadius4};
      padding: ${SPACING.spacing8};
      @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
         border-radius: ${BORDERS.borderRadius8};
         padding: ${SPACING.spacing12} ${SPACING.spacing24};
      }
      `,
      props: {
        ...UNIVERSAL_CONTAINER_STYLES,
        backgroundColor: COLORS.blue35,
      },
    },
    icon: { color: COLORS.blue60 },
  },
  failed: {
    container: {
      style: `
      border-radius: ${BORDERS.borderRadius4};
      padding: ${SPACING.spacing8};
      background-color: ${COLORS.red20};
      @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
         border-radius: ${BORDERS.borderRadius8};
         padding: ${SPACING.spacing12} ${SPACING.spacing24};
         background-color: ${COLORS.red35};
      }
      `,
      props: {
        ...UNIVERSAL_CONTAINER_STYLES,
      },
    },
    icon: { color: COLORS.red60 },
  },
  future: {
    container: {
      style: `
      background-color: ${COLORS.grey20};
      border-radius: ${BORDERS.borderRadius4};
      padding: ${SPACING.spacing8};
      @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
         border-radius: ${BORDERS.borderRadius8};
         background-color: ${COLORS.grey35};
         padding: ${SPACING.spacing12} ${SPACING.spacing24};
      }
      `,
      props: {
        ...UNIVERSAL_CONTAINER_STYLES,
      },
    },
    icon: { color: COLORS.grey60 },
  },
}

export function CenteredCommand(
  props: Omit<NonSkeletonCommandProps, 'aligned'> & { isOnDevice: boolean }
): JSX.Element {
  return (
    <Flex
      justifyContent={JUSTIFY_CENTER}
      alignItems={ALIGN_CENTER}
      width="100%"
      {...PROPS_BY_STATE[props.state].container.props}
      css={PROPS_BY_STATE[props.state].container.style}
    >
      <Flex
        alignItems={ALIGN_CENTER}
        justifyContent={JUSTIFY_CENTER}
        css={`
          margin-right: ${SPACING.spacing8};
          max-height: ${ICON_SIZE_DESKTOP};
          max-width: ${ICON_SIZE_DESKTOP};
          @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
            margin-right: ${SPACING.spacing12};
            max-height: ${ICON_SIZE_ODD};
            max-width: ${ICON_SIZE_ODD};
          }
        `}
      >
        <CommandIcon
          command={props.command}
          size="100%"
          {...PROPS_BY_STATE[props.state].icon}
        />
      </Flex>
      <Flex
        alignItems={ALIGN_CENTER}
        width="100%"
        css={`
          min-height: ${ICON_SIZE_DESKTOP};
          @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
            min-height: ${ICON_SIZE_ODD};
          }
        `}
      >
        <CommandText
          {...props}
          propagateTextLimit={props.forceTwoLineClip}
          css={
            props.forceTwoLineClip === true
              ? TEXT_CLIP_STYLE
              : ODD_ONLY_TEXT_CLIP_STYLE
          }
          modernStyledTextDefaults
        />
      </Flex>
    </Flex>
  )
}

export function LeftAlignedCommand(
  props: Omit<NonSkeletonCommandProps, 'aligned'> & { isOnDevice: boolean }
): JSX.Element {
  return (
    <Flex
      justifyContent={JUSTIFY_FLEX_START}
      alignItems={ALIGN_CENTER}
      width="100%"
      {...PROPS_BY_STATE[props.state].container.props}
      css={PROPS_BY_STATE[props.state].container.style}
    >
      <Flex
        alignItems={ALIGN_CENTER}
        justifyContent={JUSTIFY_CENTER}
        css={`
          margin-right: ${SPACING.spacing8};
          max-height: ${ICON_SIZE_DESKTOP};
          max-width: ${ICON_SIZE_DESKTOP};
          @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
            margin-right: ${SPACING.spacing12};
            max-height: ${ICON_SIZE_ODD};
            max-width: ${ICON_SIZE_ODD};
          }
        `}
      >
        <CommandIcon
          command={props.command}
          size="100%"
          {...PROPS_BY_STATE[props.state].icon}
        />
      </Flex>
      <Flex
        alignItems={ALIGN_CENTER}
        width="100%"
        css={`
          min-height: ${ICON_SIZE_DESKTOP};
          @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
            min-height: ${ICON_SIZE_ODD};
          }
        `}
      >
        <CommandText
          {...omit(props, ['isOnDevice'])}
          propagateTextLimit={props.forceTwoLineClip}
          css={
            props.forceTwoLineClip === true
              ? TEXT_CLIP_STYLE
              : ODD_ONLY_TEXT_CLIP_STYLE
          }
          modernStyledTextDefaults
        />
      </Flex>
    </Flex>
  )
}

const TEXT_CLIP_STYLE = `
   display: -webkit-box;
   -webkit-box-orient: vertical;
   overflow: hidden;
   text-overflow: ellipsis;
   word-wrap: break-word;
   -webkit-line-clamp: 2;
`
const ODD_ONLY_TEXT_CLIP_STYLE = `
   @media not (${RESPONSIVENESS.touchscreenMediaQuerySpecs}) {
      max-height: 240px;
      overflow: auto;
   }
   @media (${RESPONSIVENESS.touchscreenMediaQuerySpecs}) {
     ${TEXT_CLIP_STYLE}
}
`
