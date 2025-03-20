import { useTranslation } from 'react-i18next'
import {
  ALIGN_CENTER,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  Icon,
  ListItem,
  SPACING,
  StyledText,
  Tooltip,
  useHoverTooltip,
} from '@opentrons/components'
import { InputStepFormField } from '../../../../../../components/molecules'
import { PositionField } from '../../PipetteFields'

import type { FieldPropsByName } from '../../types'
import type { MoveLiquidPrefixType } from '../../../../../../resources/types'
import type { ReferenceFields } from '../../../../../../form-types'

export interface StepInputFieldProps {
  fieldTitle: string
  fieldKey: string
  units: string
  errorToShow?: string | null
}
interface MultiInputFieldProps {
  name: string
  tooltipContent: string
  propsForFields: FieldPropsByName
  fields: StepInputFieldProps[]
  prefix: MoveLiquidPrefixType
  isWellPosition?: boolean | null
  labwareId?: string | null
  referenceField?: ReferenceFields
}

export function MultiInputField(props: MultiInputFieldProps): JSX.Element {
  const {
    name,
    tooltipContent,
    isWellPosition,
    fields,
    prefix,
    propsForFields,
    labwareId,
    referenceField,
  } = props
  const [targetProps, tooltipProps] = useHoverTooltip()
  const { t } = useTranslation(['protocol_steps', 'form', 'tooltip'])
  return (
    <Flex
      flexDirection={DIRECTION_COLUMN}
      gridGap={SPACING.spacing8}
      padding={`0 ${SPACING.spacing16}`}
    >
      <Flex gridGap={SPACING.spacing8} alignItems={ALIGN_CENTER}>
        <StyledText desktopStyle="bodyDefaultRegular" color={COLORS.grey60}>
          {t(`protocol_steps:${name}`)}
        </StyledText>
        <Flex {...targetProps}>
          <Icon
            name="information"
            size="1rem"
            color={COLORS.grey60}
            data-testid="information_icon"
          />
        </Flex>
        <Tooltip tooltipProps={tooltipProps}>{tooltipContent}</Tooltip>
      </Flex>
      <ListItem type="default">
        <Flex
          padding={SPACING.spacing12}
          width="100%"
          flexDirection={DIRECTION_COLUMN}
          gridGap={SPACING.spacing8}
        >
          {fields.map(({ fieldTitle, fieldKey, units, errorToShow }) => (
            <InputStepFormField
              key={fieldKey}
              showTooltip={false}
              padding="0"
              title={t(fieldTitle)}
              {...propsForFields[fieldKey]}
              units={t(units)}
              errorToShow={errorToShow}
            />
          ))}
          {(isWellPosition ?? false) && (
            <PositionField
              padding="0"
              prefix={prefix}
              propsForFields={propsForFields}
              zField={`${prefix}_mmFromBottom`}
              xField={`${prefix}_x_position`}
              yField={`${prefix}_y_position`}
              labwareId={labwareId}
              isNested
              referenceField={referenceField}
            />
          )}
        </Flex>
      </ListItem>
    </Flex>
  )
}
