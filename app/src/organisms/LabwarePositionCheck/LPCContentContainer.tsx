import { css } from 'styled-components'

import {
  DIRECTION_COLUMN,
  Flex,
  RESPONSIVENESS,
  SPACING,
  POSITION_FIXED,
} from '@opentrons/components'

import { StepMeter } from '/app/atoms/StepMeter'
// TODO(jh, 02-05-25): Move ChildNavigation to molecules.
// eslint-disable-next-line opentrons/no-imports-across-applications
import { ChildNavigation } from '/app/organisms/ODD/ChildNavigation'
import { useSelector } from 'react-redux'
import { selectStepInfo } from '/app/redux/protocol-runs'

import type { FlattenSimpleInterpolation } from 'styled-components'
// eslint-disable-next-line opentrons/no-imports-across-applications
import type { ChildNavigationProps } from '/app/organisms/ODD/ChildNavigation'
import type { LPCWizardContentProps } from '/app/organisms/LabwarePositionCheck/types'

type LPCContentContainerProps = LPCWizardContentProps &
  Partial<ChildNavigationProps> & {
    children: JSX.Element
    header: string
    /* An optional style override for the content container. */
    contentStyle?: FlattenSimpleInterpolation
  }

export function LPCContentContainer({
  children,
  runId,
  contentStyle,
  ...rest
}: LPCContentContainerProps): JSX.Element {
  const { currentStepIndex, totalStepCount } = useSelector(
    selectStepInfo(runId)
  )

  return (
    <Flex css={CONTAINER_STYLE}>
      <Flex css={FIXED_HEADER_STYLE}>
        <StepMeter
          totalSteps={totalStepCount}
          currentStep={currentStepIndex + 1}
        />
        <ChildNavigation {...rest} css={CHILD_NAV_STYLE} />
      </Flex>
      <Flex css={contentStyle ?? CHILDREN_CONTAINER_STYLE}>{children}</Flex>
    </Flex>
  )
}

const CONTAINER_STYLE = css`
  flex-direction: ${DIRECTION_COLUMN};
  height: 100vh;
`

// TODO(jh, 03-12-25): This should be a fixed value in components.
const FIXED_HEADER_STYLE = css`
  position: ${POSITION_FIXED};
  top: 0;
  left: 0;
  right: 0;
  flex-direction: ${DIRECTION_COLUMN};
`

// TODO(jh, 02-05-25): Investigate whether we can remove the position: fixed styling from ChildNav.
const CHILD_NAV_STYLE = css`
  margin-top: ${SPACING.spacing8};
`
const CHILDREN_CONTAINER_STYLE = css`
  margin-top: 7.75rem;
  flex-direction: ${DIRECTION_COLUMN};
  height: 100%;
  overflow-y: auto;

  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    padding: ${SPACING.spacing32} ${SPACING.spacing60} ${SPACING.spacing40}
      ${SPACING.spacing60};
    gap: ${SPACING.spacing40};
  }
`
