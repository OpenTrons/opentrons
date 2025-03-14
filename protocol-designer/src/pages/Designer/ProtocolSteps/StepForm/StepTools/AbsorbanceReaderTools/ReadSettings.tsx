import { useTranslation } from 'react-i18next'
import {
  DIRECTION_COLUMN,
  Flex,
  SPACING,
  StyledText,
} from '@opentrons/components'
import { InputStepFormField } from '../../../../../../components/molecules'
import { getFormErrorsMappedToField } from '../../utils'
import type { StepFormErrors } from '../../../../../../steplist'
import type { FieldPropsByName } from '../../types'

interface ReadSettingsProps {
  propsForFields: FieldPropsByName
  visibleFormErrors: StepFormErrors
}

export function ReadSettings(props: ReadSettingsProps): JSX.Element {
  const { propsForFields, visibleFormErrors } = props

  const mappedErrorsToField = getFormErrorsMappedToField(visibleFormErrors)

  const { t } = useTranslation('form')
  return (
    <Flex
      flexDirection={DIRECTION_COLUMN}
      paddingX={SPACING.spacing16}
      gridGap={SPACING.spacing12}
      width="100%"
    >
      <Flex flexDirection={DIRECTION_COLUMN}>
        <StyledText desktopStyle="bodyDefaultSemiBold">
          {t('step_edit_form.absorbanceReader.export_settings.title')}
        </StyledText>
        <StyledText desktopStyle="bodyDefaultRegular">
          {t('step_edit_form.absorbanceReader.export_settings.description')}
        </StyledText>
      </Flex>
      <InputStepFormField
        padding="0"
        {...propsForFields.fileName}
        title={t('step_edit_form.field.absorbanceReader.fileName')}
        errorToShow={mappedErrorsToField.fileName?.title}
        showTooltip={false}
      />
    </Flex>
  )
}
