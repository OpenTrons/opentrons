import * as React from 'react'
import { Box, SIZE_6 } from '@opentrons/components'

import { LegacyInputField as InputFieldComponent } from './LegacyInputField'

import type { Story, Meta } from '@storybook/react'

export default {
  title: 'Library/Molecules/Forms/Input Field',
} as Meta

const Template: Story<React.ComponentProps<typeof InputFieldComponent>> = ({
  value,
  onChange,
  ...args
}) => {
  const [controlledValue, setControlledValue] = React.useState('')
  const secondaryCaption = controlledValue.length + '/12'
  const error = controlledValue.length > 12 ? 'Too many characters' : undefined
  return (
    <Box width={SIZE_6}>
      <InputFieldComponent
        {...args}
        error={error}
        secondaryCaption={secondaryCaption}
        value={controlledValue}
        onChange={e => {
          setControlledValue(e.target.value)
        }}
      />
    </Box>
  )
}
export const InputField = Template.bind({})
InputField.args = {
  label: 'Input field',
  placeholder: 'Placeholder Text',
  units: 'µL',
  caption: 'caption here',
  isIndeterminate: false,
}
