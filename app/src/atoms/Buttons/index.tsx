import * as React from 'react'
import styled from 'styled-components'
import {
  TYPOGRAPHY,
  COLORS,
  BORDERS,
  SIZE_2,
  Btn,
  NewPrimaryBtn,
  NewSecondaryBtn,
  styleProps,
} from '@opentrons/components'

import { ToggleBtn, ToggleBtnProps } from '../ToggleBtn'

export const TertiaryButton = styled(Btn)`
  ${TYPOGRAPHY.labelSemiBold}
  background-color: ${COLORS.blue};
  border-radius: ${BORDERS.radiusRoundEdge};
  box-shadow: none;
  color: ${COLORS.background};
  overflow: no-wrap;
  padding: 0.375rem 0.75rem;
  text-transform: ${TYPOGRAPHY.textTransformNone};
  white-space: nowrap;

  &:hover {
    background-color: ${COLORS.blueHover};
  }

  &:active {
    background-color: ${COLORS.bluePressed};
  }

  &:focus {
    background-color: ${COLORS.blueHover};
    outline: 0.25rem ${COLORS.blueFocus};
  }

  &:disabled {
    background-color: ${COLORS.greyDisabled};
    color: #8f8f8f;
  }

  ${styleProps}
`

export const PrimaryButton = styled(NewPrimaryBtn)`
  ${TYPOGRAPHY.pSemiBold}
  background-color: ${COLORS.blue};
  border-radius: ${BORDERS.radiusSoftCorners};
  text-transform: ${TYPOGRAPHY.textTransformNone};
  color: ${COLORS.white};

  ${styleProps}
`

export const AlertPrimaryButton = styled(NewAlertPrimaryBtn)`
  background-color: ${COLORS.error};
  border-radius: ${BORDERS.radiusSoftCorners};
  text-transform: ${TYPOGRAPHY.textTransformNone};
  ${TYPOGRAPHY.pSemiBold}

  ${styleProps}
`

export const SecondaryButton = styled(NewSecondaryBtn)`
  ${TYPOGRAPHY.pSemiBold}
  color: ${COLORS.blue};
  border-radius: ${BORDERS.radiusSoftCorners};
  text-transform: ${TYPOGRAPHY.textTransformNone};

  ${styleProps}
`

// Note (KA 3-22-22): Updated the icon in app atoms/ToggleBtn to use the new icon and height
export const ToggleButton = (props: ToggleBtnProps): JSX.Element => {
  const color = props.toggledOn ? COLORS.blue : COLORS.darkGrey
  return <ToggleBtn size={SIZE_2} color={color} {...props} />
}
