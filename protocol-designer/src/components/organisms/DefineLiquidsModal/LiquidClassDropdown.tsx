import { useTranslation } from 'react-i18next'
import { Controller } from 'react-hook-form'

import {
  COLORS,
  DIRECTION_COLUMN,
  DropdownMenu,
  Flex,
} from '@opentrons/components'

import type { Control, UseFormSetValue } from 'react-hook-form'
import type { Ingredient } from '@opentrons/step-generation'

interface LiquidClassDropdownProps {
  control: Control<Ingredient, any>
  setValue: UseFormSetValue<Ingredient>
  liquidClassOptions: Array<{ name: string; value: string }>
  liquidClass?: string
}

export function LiquidClassDropdown({
  control,
  liquidClassOptions,
  liquidClass,
  setValue,
}: LiquidClassDropdownProps): JSX.Element {
  const { t } = useTranslation('liquids')

  return (
    <Flex flexDirection={DIRECTION_COLUMN} color={COLORS.grey60}>
      <Controller
        control={control}
        name="liquidClass"
        render={({ field }) => (
          <DropdownMenu
            title={t('liquid_class.title')}
            tooltipText={t('liquid_class.tooltip')}
            dropdownType="neutral"
            width="100%"
            filterOptions={liquidClassOptions}
            currentOption={
              liquidClassOptions.find(({ value }) => value === liquidClass) ??
              liquidClassOptions[0]
            }
            onClick={value => {
              field.onChange(value)
              setValue('liquidClass', value)
            }}
          />
        )}
      />
    </Flex>
  )
}
