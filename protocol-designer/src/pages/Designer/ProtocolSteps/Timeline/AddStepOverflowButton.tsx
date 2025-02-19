import { useTranslation } from 'react-i18next'
import styled from 'styled-components'
import {
  ALIGN_CENTER,
  COLORS,
  Icon,
  SPACING,
  StyledText,
} from '@opentrons/components'
import { stepIconsByType } from '/protocol-designer/form-types'
import type { StepType } from '/protocol-designer/form-types'

export interface AddStepOverflowButtonProps {
  onClick: () => void
  stepType: StepType
  isFirstStep: boolean
  isLastStep: boolean
}

export function AddStepOverflowButton(
  props: AddStepOverflowButtonProps
): JSX.Element {
  const { onClick, stepType, isFirstStep = false, isLastStep = false } = props
  const { t, i18n } = useTranslation(['tooltip', 'application'])
  //   TODO(ja): add or delete tooltips when designs are finalized
  //   const [targetProps, tooltipProps] = useHoverTooltip({
  //     placement: TOOLTIP_RIGHT,
  //   })
  //   const tooltipMessage = t(`step_description.${stepType}`)

  const selectHoverStyle = (): string => {
    if (isFirstStep) {
      return `${SPACING.spacing8} ${SPACING.spacing8} 0 0`
    }
    if (isLastStep) {
      return `0 0 ${SPACING.spacing8} ${SPACING.spacing8}`
    }
    return '0'
  }

  return (
    <>
      <MenuButton onClick={onClick} hoverStyle={selectHoverStyle()}>
        <Icon name={stepIconsByType[stepType]} size="1rem" />
        <StyledText desktopStyle="bodyDefaultRegular">
          {i18n.format(
            t(`application:stepType.${stepType}`, stepType),
            'titleCase'
          )}
        </StyledText>
      </MenuButton>
      {/* <Tooltip tooltipProps={tooltipProps}>{tooltipMessage}</Tooltip> */}
    </>
  )
}

const MenuButton = styled.button<{ hoverStyle: string }>`
  background-color: ${COLORS.transparent};
  align-items: ${ALIGN_CENTER};
  grid-gap: ${SPACING.spacing8};
  width: 100%;
  cursor: pointer;
  padding: ${SPACING.spacing8} ${SPACING.spacing12};
  border: none;
  border-radius: ${({ hoverStyle }) => hoverStyle};
  display: flex;

  &:hover {
    background-color: ${COLORS.blue10};
    border-radius: ${({ hoverStyle }) => hoverStyle};
  }

  &:disabled {
    color: ${COLORS.grey40};
    cursor: auto;
  }
`
