import * as React from 'react'
import { useTranslation } from 'react-i18next'
import without from 'lodash/without'
import {
  Flex,
  SPACING,
  StyledText,
  RadioButton,
  DIRECTION_COLUMN,
} from '@opentrons/components'
import { WizardBody } from './WizardBody'

import type { WizardTileProps } from './types'

export function SelectGripper(props: WizardTileProps): JSX.Element | null {
  const { goBack, setValue, proceed, watch } = props
  const { t } = useTranslation(['create_new_protocol', 'shared'])
  const [gripperStatus, setGripperStatus] = React.useState<'yes' | 'no' | null>(
    null
  )
  const additionalEquipment = watch('additionalEquipment')

  const handleGripperSelection = (status: 'yes' | 'no'): void => {
    setGripperStatus(status)
    if (status === 'yes') {
      if (!additionalEquipment.includes('gripper')) {
        setValue('additionalEquipment', [...additionalEquipment, 'gripper'])
      }
    } else {
      setValue('additionalEquipment', without(additionalEquipment, 'gripper'))
    }
  }

  return (
    <WizardBody
      stepNumber={3}
      header={t('add_gripper')}
      disabled={gripperStatus == null}
      goBack={() => {
        goBack(1)
      }}
      proceed={() => {
        proceed(1)
      }}
    >
      <Flex flexDirection={DIRECTION_COLUMN} marginTop={SPACING.spacing60}>
        <StyledText
          desktopStyle="headingSmallBold"
          marginBottom={SPACING.spacing16}
        >
          {t('need_gripper')}
        </StyledText>
        <Flex gridGap={SPACING.spacing4}>
          <RadioButton
            onChange={() => {
              handleGripperSelection('yes')
            }}
            buttonLabel={t('shared:yes')}
            buttonValue="yes"
            isSelected={gripperStatus === 'yes'}
          />
          <RadioButton
            onChange={() => {
              handleGripperSelection('no')
            }}
            buttonLabel={t('shared:no')}
            buttonValue="no"
            isSelected={gripperStatus === 'no'}
          />
        </Flex>
      </Flex>
    </WizardBody>
  )
}
