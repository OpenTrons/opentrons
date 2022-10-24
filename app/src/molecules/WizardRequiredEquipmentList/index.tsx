import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { css } from 'styled-components'
import {
  Flex,
  ALIGN_CENTER,
  DIRECTION_COLUMN,
  JUSTIFY_CENTER,
  JUSTIFY_SPACE_BETWEEN,
  SPACING,
  COLORS,
  JUSTIFY_SPACE_AROUND,
  TYPOGRAPHY,
} from '@opentrons/components'

import { StyledText } from '../../atoms/text'
import { Divider } from '../../atoms/structure'
import { labwareImages } from '../../organisms/CalibrationPanels/labwareImages'
import { equipmentImages } from './EquipmentImages'

interface WizardRequiredEquipmentListProps {
  equipmentList: Array<React.ComponentProps<typeof RequiredEquipmentCard>>
  footer: string
}
export function WizardRequiredEquipmentList(
  props: WizardRequiredEquipmentListProps
): JSX.Element {
  const { t } = useTranslation('robot_calibration')
  const { equipmentList, footer } = props

  return (
    <Flex flexDirection={DIRECTION_COLUMN}>
      <StyledText as="h3" fontWeight={TYPOGRAPHY.fontWeightSemiBold}>
        {t('you_will_need')}
      </StyledText>
      <Divider />
      {equipmentList.map(requiredEquipmentProps => (
        <RequiredEquipmentCard
          key={requiredEquipmentProps.loadName}
          {...requiredEquipmentProps}
        />
      ))}
      <StyledText
        marginTop={SPACING.spacing3}
        as="label"
        color={COLORS.darkGreyEnabled}
      >
        {footer}
      </StyledText>
    </Flex>
  )
}

interface RequiredEquipmentCardProps {
  loadName: string
  displayName: string
  subtitle?: string
}

function RequiredEquipmentCard(props: RequiredEquipmentCardProps): JSX.Element {
  const { loadName, displayName, subtitle } = props

  let imageSrc: string = labwareImages.generic_custom_tiprack
  if (loadName in labwareImages) {
    src = labwareImages[loadName as keyof typeof labwareImages]
  } else if (loadName in equipmentImages) {
    src = equipmentImages[loadName as keyof typeof equipmentImages]
  }

  return (
    <>
      <Flex
        width="100%"
        justifyContent={JUSTIFY_SPACE_BETWEEN}
        alignItems={ALIGN_CENTER}
      >
        <Flex
          height="6rem"
          flex="0 1 30%"
          justifyContent={JUSTIFY_CENTER}
          alignItems={ALIGN_CENTER}
          marginRight={SPACING.spacing4}
        >
          <img
            css={css`
              max-width: 100%;
              max-height: 100%;
              flex: 0 1 5rem;
              display: block;
            `}
            src={imageSrc}
          />
        </Flex>
        <Flex
          flex="0 1 70%"
          flexDirection={DIRECTION_COLUMN}
          justifyContent={JUSTIFY_SPACE_AROUND}
        >
          <StyledText as="p">{displayName}</StyledText>
          {subtitle != null ? (
            <StyledText as="p" color={COLORS.darkGreyEnabled}>
              {subtitle}
            </StyledText>
          ) : null}
        </Flex>
      </Flex>
      <Divider />
    </>
  )
}
