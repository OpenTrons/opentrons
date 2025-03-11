import { useArgs } from '@storybook/preview-api'
import { VIEWPORT } from '../../ui-style-constants'
import { Tabs as TabsComponent } from '.'
import type { Meta, StoryObj } from '@storybook/react'

const meta: Meta<typeof TabsComponent> = {
  title: 'Helix/Molecules/Tabs',
  component: TabsComponent,
  parameters: VIEWPORT.touchScreenViewport,
  argTypes: {
    tabs: {
      control: {
        type: 'array',
      },
    },
  },
}

export default meta

type Story = StoryObj<typeof TabsComponent>

export const Tabs: Story = {
  args: {
    tabs: [
      {
        text: 'Setup',
        isActive: true,
        disabled: false,
        onClick: () => {},
      },
      {
        text: 'Parameters',
        isActive: false,
        disabled: false,
        onClick: () => {},
      },
      {
        text: 'Module Controls',
        isActive: false,
        disabled: false,
        onClick: () => {},
      },
      {
        text: 'Run Preview',
        isActive: false,
        disabled: false,
        onClick: () => {},
      },
    ],
  },
  render: function TabsStory() {
    const [args, setArgs] = useArgs<
      React.ComponentProps<typeof TabsComponent>
    >()

    const modifiedTabs = args.tabs.map((tab, index) => {
      const modifiedTabs = {
        ...tab,
        onClick: () => {
          const updatedButtons = args.tabs.map((btn, i) => ({
            ...btn,
            isActive: i === index,
          }))
          setArgs({ ...args, tabs: updatedButtons })
          tab.onClick()
        },
      }
      return modifiedTabs
    })

    return <TabsComponent tabs={modifiedTabs} />
  },
}
