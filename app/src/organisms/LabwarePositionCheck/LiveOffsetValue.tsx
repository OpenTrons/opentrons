import * as React from 'react'
import {
  Flex,
  Icon,
  SIZE_1,
  SPACING,
  ALIGN_CENTER,
  TYPOGRAPHY,
  BORDERS,
  COLORS,
  DIRECTION_COLUMN,
} from '@opentrons/components'
import { StyledText } from '../../atoms/text'

import type { StyleProps } from '@opentrons/components'
import { useTranslation } from 'react-i18next'

interface OffsetVectorProps extends StyleProps {
  x: number
  y: number
  z: number
}

export function LiveOffsetValue(props: OffsetVectorProps): JSX.Element {
  const { x, y, z, ...styleProps } = props
  const axisLabels = ['X', 'Y', 'Z']
  const { t } = useTranslation('labware_position_check')
  return (
    <Flex
      flexDirection={DIRECTION_COLUMN}
      marginY={SPACING.spacing8}
      gridGap={SPACING.spacing4}
    >
      <StyledText
        as="label"
        fontWeight={TYPOGRAPHY.fontWeightSemiBold}
        textTransform={TYPOGRAPHY.textTransformCapitalize}
      >
        {t('labware_offset_data')}
      </StyledText>
      <Flex
        alignItems={ALIGN_CENTER}
        border={`${BORDERS.styleSolid} 1px ${COLORS.lightGreyHover}`}
        borderRadius={BORDERS.radiusSoftCorners}
        padding={SPACING.spacing8}
        {...styleProps}
      >
        <Icon name="reticle" size={SIZE_1} />
        {[x, y, z].map((axis, index) => (
          <React.Fragment key={index}>
            <StyledText
              as="p"
              marginLeft={SPACING.spacing8}
              marginRight={SPACING.spacing4}
              fontWeight={TYPOGRAPHY.fontWeightSemiBold}
            >
              {axisLabels[index]}
            </StyledText>
            <StyledText as="p">{axis.toFixed(1)}</StyledText>
          </React.Fragment>
        ))}
      </Flex>
    </Flex>
  )
}
