import { STYLE_PROPS } from '../../primitives'
import { Toolbox as ToolboxComponent } from './index'
import type { Meta, StoryObj } from '@storybook/react'

const meta: Meta<typeof ToolboxComponent> = {
  title: 'Helix/Organisms/Toolbox',
  component: ToolboxComponent,
  argTypes: {
    // Disable all StyleProps
    ...Object.fromEntries(
      [...STYLE_PROPS, 'as', 'ref', 'theme', 'forwardedAs'].map(prop => [
        prop,
        { table: { disable: true } },
      ])
    ),
  },
  decorators: [Story => <Story />],
}

export default meta
type Story = StoryObj<typeof ToolboxComponent>

export const Toolbox: Story = {
  args: {
    title: 'Header',
    children: <div>Slot Component: Replace me using the component panel.</div>,
    confirmButtonText: 'Done',
    onCloseClick: () => {},
    titleIconName: 'swap-horizontal',
    closeButtonText: 'Text link',
    onConfirmClick: () => {},
  },
}
