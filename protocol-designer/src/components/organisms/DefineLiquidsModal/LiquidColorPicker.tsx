import { SketchPicker } from 'react-color'
import { Controller } from 'react-hook-form'

import { Flex, POSITION_ABSOLUTE } from '@opentrons/components'
import { DEFAULT_LIQUID_COLORS } from '@opentrons/shared-data'
import { rgbaToHex } from './util'

import type { RefObject } from 'react'
import type { Control, UseFormSetValue } from 'react-hook-form'
import type { ColorResult } from 'react-color'
import type { Ingredient } from '@opentrons/step-generation'

interface LiquidColorPickerProps {
  chooseColorWrapperRef: RefObject<HTMLDivElement>
  control: Control<Ingredient, any>
  color: string
  setValue: UseFormSetValue<Ingredient>
}

export function LiquidColorPicker({
  chooseColorWrapperRef,
  control,
  color,
  setValue,
}: LiquidColorPickerProps): JSX.Element {
  return (
    <Flex
      position={POSITION_ABSOLUTE}
      left="4.375rem"
      top="4.6875rem"
      ref={chooseColorWrapperRef}
      zIndex={2}
    >
      <Controller
        name="displayColor"
        control={control}
        render={({ field }) => (
          <SketchPicker
            presetColors={DEFAULT_LIQUID_COLORS}
            color={color}
            onChange={(color: ColorResult) => {
              const hex = rgbaToHex(color.rgb)
              setValue('displayColor', hex)
              field.onChange(hex)
            }}
          />
        )}
      />
    </Flex>
  )
}
