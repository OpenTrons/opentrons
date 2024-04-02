import * as React from 'react'
import { useTranslation } from 'react-i18next'
import {
  ALIGN_CENTER,
  DIRECTION_COLUMN,
  Flex,
  SPACING,
  StyledText,
  TYPOGRAPHY,
} from '@opentrons/components'
import { RadioButton } from '../../atoms/buttons'
import { useToaster } from '../ToasterOven'
import { ChildNavigation } from '../ChildNavigation'
import type { RunTimeParameter } from '@opentrons/shared-data'

interface ChooseEnumProps {
  handleGoBack: () => void
  parameter: RunTimeParameter
  setParameter: (value: boolean | string | number, variableName: string) => void
  rawValue: number | string | boolean
}

export function ChooseEnum({
  handleGoBack,
  parameter,
  setParameter,
  rawValue,
}: ChooseEnumProps): JSX.Element {
  const { makeSnackbar } = useToaster()

  const { t } = useTranslation(['protocol_setup', 'shared'])
  if (parameter.type !== 'boolean' && parameter.type !== 'str') {
    console.error(
      `parameter type is expected to be boolean or string for parameter ${parameter.displayName}`
    )
  }
  const options = parameter.type === 'str' ? parameter.choices : [true, false]
  const handleOnClick = (newValue: string | number | boolean): void => {
    setParameter(newValue, parameter.variableName)
  }

  React.useEffect(() => {
    if (rawValue === parameter.default) {
      makeSnackbar(t('no_custom_values'))
    }
  }, [rawValue])

  return (
    <>
      <ChildNavigation
        header={t('choose_enum', { displayName: parameter.displayName })}
        onClickBack={handleGoBack}
        buttonType="tertiaryLowLight"
        buttonText={t('restore_default')}
        onClickButton={() => {
          setParameter(parameter.default, parameter.variableName)
        }}
      />
      <Flex
        marginTop="7.75rem"
        alignSelf={ALIGN_CENTER}
        gridGap={SPACING.spacing8}
        paddingX={SPACING.spacing40}
        flexDirection={DIRECTION_COLUMN}
        paddingBottom={SPACING.spacing40}
      >
        <StyledText
          as="h4"
          textAlign={TYPOGRAPHY.textAlignLeft}
          marginBottom={SPACING.spacing16}
        >
          {parameter.description}
        </StyledText>

        {options?.map(option => {
          const isBoolean = option === true || option === false
          return (
            <RadioButton
              key={`${isBoolean ? option : option.value}`}
              data-testid={`${isBoolean ? option : option.value}`}
              buttonLabel={
                isBoolean
                  ? option === true
                    ? t('true')
                    : t('false')
                  : option.displayName
              }
              buttonValue={
                isBoolean
                  ? option === true
                    ? 'true'
                    : 'false'
                  : `${option.value}`
              }
              onChange={() => handleOnClick(isBoolean ? option : option.value)}
              isSelected={
                isBoolean ? option === rawValue : option.value === rawValue
              }
            />
          )
        })}
      </Flex>
    </>
  )
}
