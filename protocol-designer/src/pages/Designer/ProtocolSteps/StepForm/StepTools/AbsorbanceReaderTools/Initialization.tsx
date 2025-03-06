import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ALIGN_CENTER,
  ALIGN_FLEX_END,
  Btn,
  Check,
  COLORS,
  DIRECTION_COLUMN,
  Divider,
  DropdownMenu,
  EmptySelectorButton,
  FLEX_MAX_CONTENT,
  Flex,
  Icon,
  InputField,
  JUSTIFY_SPACE_BETWEEN,
  ListButton,
  ListItem,
  RadioButton,
  SPACING,
  StyledText,
  TEXT_DECORATION_UNDERLINE,
  Tooltip,
  useHoverTooltip,
} from '@opentrons/components'
import { LINK_BUTTON_STYLE } from '../../../../../../atoms'
import {
  ABSORBANCE_READER_MAX_WAVELENGTH_NM,
  ABSORBANCE_READER_MIN_WAVELENGTH_NM,
} from '../../../../../../constants'
import { maskToInteger } from '../../../../../../steplist/fieldLevel/processing'
import { getFormErrorsMappedToField } from '../../utils'

import type { Dispatch, SetStateAction } from 'react'
import type { TFunction } from 'i18next'
import type { DropdownOption } from '@opentrons/components'
import type { FormData } from '../../../../../../form-types'
import type { StepFormErrors } from '../../../../../../steplist'
import type { InitializationMode } from '../../../../../../step-forms/types'
import type { FieldProps, FieldPropsByName } from '../../types'
import type { ErrorMappedToField } from '../../utils'

const MAX_WAVELENGTHS = 6
const CUSTOM_OPTION: DropdownOption = { name: 'Other', value: '' }
const DEFINED_OPTIONS: DropdownOption[] = [
  {
    name: '450 nm (blue)',
    value: '450',
  },
  {
    name: '562 nm (green)',
    value: '562',
  },
  { name: '600 nm (orange)', value: '600' },
  { name: '650 nm (red)', value: '650' },
]
const WAVELENGTH_OPTIONS = [...DEFINED_OPTIONS, CUSTOM_OPTION]

interface InitializationProps {
  formData: FormData
  propsForFields: FieldPropsByName
  visibleFormErrors: StepFormErrors
  showFormErrors: boolean
}

const getBadWavelengthError = (
  wavelength: string | null,
  showErrors: boolean,
  t: TFunction
): string | null => {
  if (!showErrors) {
    return null
  }
  if (!wavelength) {
    return t(
      'step_edit_form.absorbanceReader.errors.custom_wavelength_required'
    )
  }
  const wavelengthFloat = parseFloat(wavelength)
  if (
    wavelengthFloat < ABSORBANCE_READER_MIN_WAVELENGTH_NM ||
    wavelengthFloat > ABSORBANCE_READER_MAX_WAVELENGTH_NM
  ) {
    return t('step_edit_form.absorbanceReader.errors.wavelength_out_of_range')
  }
  return null
}

export function Initialization(props: InitializationProps): JSX.Element {
  const { formData, propsForFields, visibleFormErrors, showFormErrors } = props
  const [numWavelengths, setNumWavelengths] = useState<number>(
    (formData.wavelengths?.length as number) ?? 1
  )
  const mappedErrorsToField = getFormErrorsMappedToField(visibleFormErrors)

  return (
    <Flex
      gridGap={SPACING.spacing4}
      flexDirection={DIRECTION_COLUMN}
      width="100%"
    >
      <SelectMode modeProps={propsForFields.mode} />
      <Divider marginY={SPACING.spacing12} />
      <IntializationEditor
        formData={formData}
        propsForFields={propsForFields}
        wavelengths={formData.wavelengths ?? []}
        wavelengthsProps={propsForFields.wavelengths}
        mode={formData.mode}
        numWavelengths={numWavelengths}
        setNumWavelengths={setNumWavelengths}
        mappedErrorsToField={mappedErrorsToField}
        showFormErrors={showFormErrors}
      />
    </Flex>
  )
}

interface SelectModeProps {
  modeProps: FieldProps
}

function SelectMode(props: SelectModeProps): JSX.Element {
  const { modeProps } = props
  const { t } = useTranslation('form')
  const buttonValues = ['single', 'multi']
  return (
    <Flex
      flexDirection={DIRECTION_COLUMN}
      paddingX={SPACING.spacing16}
      gridGap={SPACING.spacing4}
    >
      <StyledText desktopStyle="bodyDefaultSemiBold">
        {t('step_edit_form.field.absorbanceReader.mode.label')}
      </StyledText>
      {buttonValues.map(val => (
        <RadioButton
          key={val}
          buttonLabel={t(`step_edit_form.field.absorbanceReader.mode.${val}`)}
          buttonValue={val}
          onChange={() => {
            modeProps.updateValue(val)
          }}
          isSelected={modeProps.value === val}
          largeDesktopBorderRadius
        />
      ))}
    </Flex>
  )
}

interface InitializationEditorProps {
  formData: FormData
  propsForFields: FieldPropsByName
  wavelengths: string[]
  mode: InitializationMode
  wavelengthsProps: FieldProps
  numWavelengths: number
  setNumWavelengths: Dispatch<SetStateAction<number>>
  mappedErrorsToField: ErrorMappedToField
  showFormErrors: boolean
}

function IntializationEditor(props: InitializationEditorProps): JSX.Element {
  const {
    formData,
    propsForFields,
    wavelengths,
    mode,
    wavelengthsProps,
    numWavelengths,
    setNumWavelengths,
    mappedErrorsToField,
    showFormErrors,
  } = props
  const { t } = useTranslation('form')

  const handleDeleteWavelength = (index: number): void => {
    const clone = [
      ...wavelengths.slice(0, index),
      ...wavelengths.slice(index + 1, wavelengths.length),
    ]
    wavelengthsProps.updateValue(clone)
    setNumWavelengths(numWavelengths - 1)
  }

  const handleAddWavelength = (): void => {
    setNumWavelengths(numWavelengths + 1)
    wavelengthsProps.updateValue([...wavelengths, WAVELENGTH_OPTIONS[0].value])
  }

  const wavelengthItems: JSX.Element[] = []
  for (let i = 0; i < (mode === 'multi' ? numWavelengths : 1); i++) {
    const wavelength = i <= wavelengths.length ? wavelengths[i] : null
    wavelengthItems.push(
      <ListItem
        type="default"
        padding={SPACING.spacing12}
        flexDirection={DIRECTION_COLUMN}
        gridGap={SPACING.spacing8}
      >
        <WavelengthItem
          wavelength={wavelength}
          wavelengths={wavelengths}
          wavelengthsProps={wavelengthsProps}
          handleDeleteWavelength={handleDeleteWavelength}
          mode={mode}
          index={i}
          error={getBadWavelengthError(
            wavelength,
            showFormErrors,
            t as TFunction
          )}
        />
      </ListItem>
    )
  }
  return (
    <Flex flexDirection={DIRECTION_COLUMN}>
      <Flex
        flexDirection={DIRECTION_COLUMN}
        gridGap={SPACING.spacing4}
        paddingX={SPACING.spacing16}
      >
        <StyledText desktopStyle="bodyDefaultSemiBold">
          {t(
            `step_edit_form.absorbanceReader.initialization_setting.${mode}.title`
          )}
        </StyledText>
        {mode === 'multi' ? (
          <StyledText desktopStyle="bodyDefaultRegular">
            {t(
              `step_edit_form.absorbanceReader.initialization_setting.${mode}.description`
            )}
          </StyledText>
        ) : null}
        <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing4}>
          {wavelengthItems}
        </Flex>
        {mode === 'multi' && wavelengths.length < MAX_WAVELENGTHS ? (
          <Flex width={FLEX_MAX_CONTENT}>
            <EmptySelectorButton
              onClick={handleAddWavelength}
              text={t('step_edit_form.absorbanceReader.add_wavelength.label')}
              textAlignment="left"
              disabled={numWavelengths === MAX_WAVELENGTHS}
              iconName="plus"
            />
          </Flex>
        ) : null}
      </Flex>
      {mode === 'single' ? (
        <>
          <Divider marginY={SPACING.spacing12} />
          <Flex paddingX={SPACING.spacing16} width="100%">
            <ReferenceWavelength
              formData={formData}
              propsForFields={propsForFields}
              error={mappedErrorsToField.referenceWavelength?.title ?? null}
            />
          </Flex>
        </>
      ) : null}
    </Flex>
  )
}

interface WavelengthItemProps {
  wavelength: string | null
  wavelengths: string[]
  wavelengthsProps: FieldProps
  handleDeleteWavelength: (_: number) => void
  mode: InitializationMode
  index: number
  error: string | null
}

function WavelengthItem(props: WavelengthItemProps): JSX.Element {
  const {
    wavelength,
    wavelengths,
    wavelengthsProps,
    handleDeleteWavelength,
    index,
    error,
    mode,
  } = props
  const { t } = useTranslation('form')
  const showCustom = !DEFINED_OPTIONS.some(({ value }) => value === wavelength)
  const [isFocused, setIsFocused] = useState<boolean>(false)
  return (
    <>
      <DropdownMenu
        title={t('step_edit_form.absorbanceReader.wavelength')}
        filterOptions={WAVELENGTH_OPTIONS}
        dropdownType="neutral"
        width="100%"
        currentOption={
          WAVELENGTH_OPTIONS.find(({ value }) => {
            return wavelength != null && !showCustom && value === wavelength
          }) ?? CUSTOM_OPTION
        }
        onClick={wavelengthOption => {
          if (
            WAVELENGTH_OPTIONS.some(
              ({ value: val }) => val === wavelengthOption
            )
          ) {
            const clone = wavelengths
            clone[index] = wavelengthOption
            wavelengthsProps.updateValue(clone)
          }
        }}
      />
      {showCustom ? (
        <InputField
          title={t('step_edit_form.absorbanceReader.custom_wavelength.label')}
          caption={t(
            'step_edit_form.absorbanceReader.custom_wavelength.caption'
          )}
          value={wavelength}
          onChange={e => {
            const clone = wavelengths
            const updatedValue = maskToInteger(e.target.value)
            clone[index] = updatedValue
            wavelengthsProps.updateValue(clone)
          }}
          onFocus={() => {
            setIsFocused(true)
          }}
          onBlur={() => {
            setIsFocused(false)
          }}
          error={!isFocused ? error : null}
        />
      ) : null}
      {wavelengths.length > 1 && mode === 'multi' ? (
        <Btn
          onClick={() => {
            handleDeleteWavelength(index)
          }}
          padding={SPACING.spacing4}
          css={LINK_BUTTON_STYLE}
          alignSelf={ALIGN_FLEX_END}
          textDecoration={TEXT_DECORATION_UNDERLINE}
        >
          <StyledText desktopStyle="bodyDefaultRegular">
            {t('step_edit_form.absorbanceReader.delete')}
          </StyledText>
        </Btn>
      ) : null}
    </>
  )
}

interface ReferenceWavelengthProps {
  formData: FormData
  propsForFields: FieldPropsByName
  error: string | null
}

function ReferenceWavelength(props: ReferenceWavelengthProps): JSX.Element {
  const { formData, propsForFields, error } = props
  const { t } = useTranslation('form')
  const isExpanded = formData.referenceWavelengthActive === true
  const referenceWavelength = formData.referenceWavelength
  const showCustom = !DEFINED_OPTIONS.some(
    ({ value }) => value === referenceWavelength
  )

  const [isFocused, setIsFocused] = useState<boolean>(false)
  const [targetProps, tooltipProps] = useHoverTooltip()

  return (
    <Flex
      flexDirection={DIRECTION_COLUMN}
      width="100%"
      gridGap={SPACING.spacing4}
    >
      <Flex gridGap={SPACING.spacing8} alignItems={ALIGN_CENTER}>
        <StyledText desktopStyle="bodyDefaultSemiBold">
          {t('step_edit_form.absorbanceReader.reference_wavelength.title')}
        </StyledText>
        <Flex {...targetProps}>
          <Icon name="information" size="1rem" color={COLORS.grey60} />
        </Flex>
        <Tooltip tooltipProps={tooltipProps}>
          {t('step_edit_form.absorbanceReader.reference_wavelength.tooltip')}
        </Tooltip>
      </Flex>
      <ListButton
        type="noActive"
        padding={SPACING.spacing12}
        flexDirection={DIRECTION_COLUMN}
        gridGap={SPACING.spacing8}
        onClick={() => {
          propsForFields.referenceWavelengthActive.updateValue(!isExpanded)
        }}
      >
        <Flex
          width="100%"
          justifyContent={JUSTIFY_SPACE_BETWEEN}
          alignItems={ALIGN_CENTER}
        >
          <StyledText desktopStyle="bodyDefaultRegular">
            {t(
              'step_edit_form.field.absorbanceReader.referenceWavelengthActive'
            )}
          </StyledText>
          <Check
            color={COLORS.blue50}
            isChecked={formData.referenceWavelengthActive === true}
          />
        </Flex>
        {isExpanded ? (
          <>
            <DropdownMenu
              title={t('step_edit_form.absorbanceReader.wavelength')}
              filterOptions={WAVELENGTH_OPTIONS}
              dropdownType="neutral"
              width="100%"
              currentOption={
                WAVELENGTH_OPTIONS.find(({ value }) => {
                  return (
                    referenceWavelength != null && value === referenceWavelength
                  )
                }) ?? CUSTOM_OPTION
              }
              onClick={wavelengthOption => {
                if (
                  WAVELENGTH_OPTIONS.some(
                    ({ value: val }) => val === wavelengthOption
                  )
                ) {
                  propsForFields.referenceWavelength.updateValue(
                    wavelengthOption
                  )
                }
              }}
            />
            {showCustom ? (
              <InputField
                title={t(
                  'step_edit_form.absorbanceReader.custom_wavelength.label'
                )}
                caption={t(
                  'step_edit_form.absorbanceReader.custom_wavelength.caption'
                )}
                value={formData.referenceWavelength ?? ''}
                onChange={e => {
                  propsForFields.referenceWavelength.updateValue(
                    maskToInteger(e.target.value)
                  )
                }}
                onClick={e => {
                  e.stopPropagation()
                }}
                onBlur={() => {
                  setIsFocused(false)
                }}
                onFocus={() => {
                  setIsFocused(true)
                }}
                error={!isFocused ? error : null}
              />
            ) : null}
          </>
        ) : null}
      </ListButton>
    </Flex>
  )
}
