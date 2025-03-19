import { useTranslation } from 'react-i18next'
import {
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  SPACING,
  StyledText,
} from '@opentrons/components'
import { TextAreaField } from '../../../../../../components/molecules'
import type { ChangeEvent } from 'react'
import type { StepFormProps } from '../../types'

export function CommentTools(props: StepFormProps): JSX.Element {
  const { t, i18n } = useTranslation('form')
  const { propsForFields } = props

  return (
    <Flex
      flexDirection={DIRECTION_COLUMN}
      gridGap={SPACING.spacing4}
      padding={SPACING.spacing16}
    >
      <StyledText desktopStyle="bodyDefaultRegular" color={COLORS.grey60}>
        {i18n.format(t('step_edit_form.field.comment.label'), 'capitalize')}
      </StyledText>
      <TextAreaField
        value={propsForFields.message.value as string}
        onChange={(e: ChangeEvent<any>) => {
          propsForFields.message.updateValue(e.currentTarget.value)
        }}
        height="7rem"
      />
    </Flex>
  )
}
