import * as React from 'react'
import capitalize from 'lodash/capitalize'

import {
  Flex,
  Icon,
  ALIGN_CENTER,
  BORDERS,
<<<<<<< HEAD
=======
  COLORS,
>>>>>>> 2524ab95c98ff696e637a42d46ea6a893c63f735
  SPACING,
  TYPOGRAPHY,
} from '@opentrons/components'

import { StyledText } from '../text'
interface StatusLabelProps {
  status: string
  backgroundColor: string
  showIcon?: boolean
  iconColor?: string
  textColor?: string
  fontWeight?: number
  iconSize?: string
  pulse?: boolean
  id?: string
}

export const StatusLabel = (props: StatusLabelProps): JSX.Element | null => {
  const {
    status,
    backgroundColor,
    iconColor,
    textColor,
    fontWeight,
    iconSize,
    pulse,
    showIcon = true,
    id,
  } = props

  return (
    <Flex>
      <Flex
        backgroundColor={backgroundColor}
        borderRadius={BORDERS.radiusSoftCorners}
        gridGap={SPACING.spacing4}
        paddingX={SPACING.spacing6}
        paddingY={SPACING.spacing2}
        alignItems={ALIGN_CENTER}
        marginTop={SPACING.spacing4}
        marginBottom={SPACING.spacing4}
        data-testid={
          id != null ? `status_label_${status}_${id}` : `status_label_${status}`
        }
      >
        {showIcon ? (
          <Icon
            name="circle"
            color={iconColor}
            size={iconSize ?? '0.25rem'}
            data-testid="status_circle"
          >
            {pulse != null && pulse ? (
              <animate
                attributeName="fill"
                values={`${iconColor}; transparent`}
                dur="1s"
                calcMode="discrete"
                repeatCount="indefinite"
                data-testid="pulsing_status_circle"
              />
            ) : null}
          </Icon>
        ) : null}
        <StyledText
          fontSize={TYPOGRAPHY.fontSizeLabel}
          fontWeight={fontWeight ?? TYPOGRAPHY.fontWeightRegular}
<<<<<<< HEAD
          color={textColor ?? COLORS.blue60}
=======
          color={textColor ?? COLORS.bluePressed}
>>>>>>> 2524ab95c98ff696e637a42d46ea6a893c63f735
        >
          {capitalize(status)}
        </StyledText>
      </Flex>
    </Flex>
  )
}
