import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { yupResolver } from '@hookform/resolvers/yup'
import * as Yup from 'yup'
import { Controller, useForm } from 'react-hook-form'
import { getSortedLiquidClassDefs } from '@opentrons/shared-data'
import {
  Btn,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  InputField,
  JUSTIFY_END,
  JUSTIFY_SPACE_BETWEEN,
  LiquidIcon,
  Modal,
  PrimaryButton,
  SecondaryButton,
  SPACING,
  StyledText,
  TYPOGRAPHY,
  useOnClickOutside,
} from '@opentrons/components'
import * as labwareIngredActions from '../../labware-ingred/actions'
import { selectors as labwareIngredSelectors } from '../../labware-ingred/selectors'
import { HandleEnter } from '../../atoms/HandleEnter'
import { LINE_CLAMP_TEXT_STYLE } from '../../atoms'
import { TextAreaField } from '../../molecules'
import { getEnableLiquidClasses } from '../../feature-flags/selectors'
import { swatchColors } from './swatchColors'
import { LiquidColorPicker } from './LiquidColorPicker'
import { LiquidClassDropdown } from './LiquidClassDropdown'

import type { Ingredient } from '@opentrons/step-generation'
import type { ThunkDispatch } from 'redux-thunk'
import type { BaseState } from '../../types'

const liquidEditFormSchema: any = Yup.object().shape({
  displayName: Yup.string().required('liquid name is required'),
  displayColor: Yup.string(),
  description: Yup.string(),
  liquidClass: Yup.string(),
})

interface DefineLiquidsModalProps {
  onClose: () => void
}
export function DefineLiquidsModal(
  props: DefineLiquidsModalProps
): JSX.Element {
  const { onClose } = props
  const dispatch = useDispatch<ThunkDispatch<BaseState, any, any>>()
  const { t } = useTranslation(['liquids', 'shared'])
  const selectedLiquid = useSelector(
    labwareIngredSelectors.getSelectedLiquidGroupState
  )
  const nextGroupId = useSelector(labwareIngredSelectors.getNextLiquidGroupId)
  const selectedLiquidGroupState = useSelector(
    labwareIngredSelectors.getSelectedLiquidGroupState
  )
  const [showColorPicker, setShowColorPicker] = useState<boolean>(false)
  const chooseColorWrapperRef = useOnClickOutside<HTMLDivElement>({
    onClickOutside: () => {
      setShowColorPicker(false)
    },
  })
  const allIngredientGroupFields = useSelector(
    labwareIngredSelectors.allIngredientGroupFields
  )
  const enableLiquidClasses = useSelector(getEnableLiquidClasses)
  const sortedLiquidClassDefs = getSortedLiquidClassDefs()

  const liquidGroupId = selectedLiquidGroupState.liquidGroupId
  const deleteLiquidGroup = (): void => {
    if (liquidGroupId != null) {
      dispatch(labwareIngredActions.deleteLiquidGroup(liquidGroupId))
    }
    onClose()
  }

  const cancelForm = (): void => {
    dispatch(labwareIngredActions.deselectLiquidGroup())
    onClose()
  }

  const saveForm = (formData: Ingredient): void => {
    dispatch(
      labwareIngredActions.editLiquidGroup({
        ...formData,
      })
    )
    onClose()
  }

  const selectedIngredFields =
    liquidGroupId != null ? allIngredientGroupFields[liquidGroupId] : null
  const liquidId = selectedLiquid.liquidGroupId ?? nextGroupId

  const initialValues: Ingredient = {
    displayName: selectedIngredFields?.displayName ?? '',
    displayColor: selectedIngredFields?.displayColor ?? swatchColors(liquidId),
    liquidClass: selectedIngredFields?.liquidClass ?? '',
    description: selectedIngredFields?.description ?? '',
    liquidGroupId: liquidGroupId ?? nextGroupId,
  }

  const {
    handleSubmit,
    formState,
    control,
    watch,
    setValue,
    register,
  } = useForm<Ingredient>({
    defaultValues: initialValues,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    resolver: yupResolver(liquidEditFormSchema),
  })
  const name = watch('displayName')
  const color = watch('displayColor')
  const liquidClass = watch('liquidClass')
  const { errors, touchedFields } = formState

  const handleLiquidEdits = (values: Ingredient): void => {
    saveForm({
      displayName: values.displayName,
      displayColor: values.displayColor,
      liquidClass:
        values.liquidClass !== '' ? values.liquidClass ?? undefined : undefined,
      description: values.description !== '' ? values.description : null,
      liquidGroupId: values.liquidGroupId,
    })
  }

  const liquidClassOptions = [
    { name: t('liquids:dont_use_liquid_class'), value: '' },
    ...Object.entries(sortedLiquidClassDefs).map(
      ([liquidClassDefName, { displayName, description }]) => {
        return {
          value: liquidClassDefName,
          name: t('liquids:liquid_class_name_description', {
            displayName,
            description,
          }),
        }
      }
    ),
  ]

  return (
    <HandleEnter
      onEnter={() => {
        void handleSubmit(handleLiquidEdits)()
      }}
    >
      <Modal
        marginLeft="0"
        zIndexOverlay={15}
        width="37.125rem"
        title={
          selectedIngredFields != null ? (
            <Flex gridGap={SPACING.spacing8}>
              <LiquidIcon color={initialValues.displayColor} />
              <StyledText
                desktopStyle="bodyLargeSemiBold"
                css={LINE_CLAMP_TEXT_STYLE(1)}
              >
                {initialValues.displayName}
              </StyledText>
            </Flex>
          ) : (
            t('define_liquid')
          )
        }
        type="info"
        onClose={onClose}
      >
        <form
          onSubmit={() => {
            void handleSubmit(handleLiquidEdits)()
          }}
        >
          <>
            {showColorPicker ? (
              <LiquidColorPicker
                chooseColorWrapperRef={chooseColorWrapperRef}
                control={control}
                color={color}
                setValue={setValue}
              />
            ) : null}

            <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing32}>
              <Flex
                flexDirection={DIRECTION_COLUMN}
                gridGap={SPACING.spacing12}
              >
                <Flex
                  flexDirection={DIRECTION_COLUMN}
                  color={COLORS.grey60}
                  gridGap={SPACING.spacing4}
                >
                  <StyledText desktopStyle="bodyDefaultRegular">
                    {t('name')}
                  </StyledText>
                  <Controller
                    control={control}
                    name="displayName"
                    render={({ field }) => (
                      <InputField
                        name="displayName"
                        error={
                          touchedFields.displayName != null
                            ? errors.displayName?.message
                            : null
                        }
                        value={name}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                      />
                    )}
                  />
                </Flex>
                <Flex
                  flexDirection={DIRECTION_COLUMN}
                  color={COLORS.grey60}
                  gridGap={SPACING.spacing4}
                >
                  <TextAreaField
                    title={t('description')}
                    {...register('description')}
                    value={watch('description')}
                    height="4.75rem"
                  />
                </Flex>
                {enableLiquidClasses ? (
                  <LiquidClassDropdown
                    control={control}
                    setValue={setValue}
                    liquidClassOptions={liquidClassOptions}
                    liquidClass={liquidClass}
                  />
                ) : null}
                <Flex
                  flexDirection={DIRECTION_COLUMN}
                  color={COLORS.grey60}
                  gridGap={SPACING.spacing4}
                >
                  <StyledText desktopStyle="bodyDefaultRegular">
                    {t('display_color')}
                  </StyledText>

                  <LiquidIcon
                    onClick={() => {
                      setShowColorPicker(prev => !prev)
                    }}
                    color={color}
                    size="medium"
                  />
                </Flex>
              </Flex>
              <Flex
                justifyContent={
                  selectedIngredFields != null
                    ? JUSTIFY_SPACE_BETWEEN
                    : JUSTIFY_END
                }
                gridGap={SPACING.spacing8}
              >
                {selectedIngredFields != null ? (
                  <Btn
                    onClick={deleteLiquidGroup}
                    textDecoration={TYPOGRAPHY.textDecorationUnderline}
                  >
                    <StyledText desktopStyle="bodyDefaultRegular">
                      {t('delete_liquid')}
                    </StyledText>
                  </Btn>
                ) : (
                  <SecondaryButton onClick={cancelForm}>
                    {t('shared:close')}
                  </SecondaryButton>
                )}
                <PrimaryButton
                  type="submit"
                  disabled={
                    errors.displayName != null ||
                    name === '' ||
                    errors.displayColor != null
                  }
                >
                  {t('shared:save')}
                </PrimaryButton>
              </Flex>
            </Flex>
          </>
        </form>
      </Modal>
    </HandleEnter>
  )
}
