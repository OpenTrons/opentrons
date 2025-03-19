import { SPACING, VIEWPORT } from '../../ui-style-constants'
import { DIRECTION_COLUMN } from '../../styles'
import { Flex } from '../../primitives'
import { StyledText } from '../StyledText'
import { ListItemDescriptor } from './ListItemChildren/ListItemDescriptor'
import { ListItem as ListItemComponent, ListItemCustomize } from '.'
import exampleImage from '../../images/labware/measurement-guide/images/spacing/spacing-well-rectangular@3x.png'
import type { Meta, StoryObj } from '@storybook/react'
import type { DropdownMenuProps } from '../../molecules'

const meta: Meta<typeof ListItemComponent> = {
  title: 'ListItem',
  component: ListItemComponent,
  argTypes: {
    type: {
      control: {
        type: 'select',
        options: [
          'error',
          'default',
          'success',
          'warning',
          'unavailable',
          'defaultOnColor',
          'successOnColor',
          'warningOnColor',
          'errorOnColor',
        ],
      },
    },
  },
  parameters: VIEWPORT.touchScreenViewport,
}

export default meta

type Story = StoryObj<typeof ListItemComponent>

export const ListItem: Story = {
  args: {
    type: 'default',
    children: (
      <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing4}>
        <StyledText as="p">
          Slot Component: Replace me using the component panel.
        </StyledText>
        <StyledText as="p">
          Slot Component: Replace me using the component panel.
        </StyledText>
        <StyledText as="p">
          Slot Component: Replace me using the component panel.
        </StyledText>
      </Flex>
    ),
  },
}

export const ListItemDescriptorDefault: Story = {
  args: {
    type: 'default',
    children: (
      <ListItemDescriptor
        type="large"
        content={<div>mock content</div>}
        description={<div>mock description</div>}
      />
    ),
  },
}

export const ListItemDescriptorMini: Story = {
  args: {
    type: 'default',
    children: (
      <ListItemDescriptor
        type="default"
        content={<div>mock content</div>}
        description={<div>mock description</div>}
      />
    ),
  },
}

export const ListItemOnColorVariants: Story = {
  render: args => (
    <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing16}>
      <ListItemComponent type="defaultOnColor">
        <StyledText as="p">Default on Color Variant</StyledText>
      </ListItemComponent>
      <ListItemComponent type="successOnColor">
        <StyledText as="p">Success on Color Variant</StyledText>
      </ListItemComponent>
      <ListItemComponent type="warningOnColor">
        <StyledText as="p">Warning on Color Variant</StyledText>
      </ListItemComponent>
      <ListItemComponent type="errorOnColor">
        <StyledText as="p">Error on Color Variant</StyledText>
      </ListItemComponent>
    </Flex>
  ),
}

const dropdownProps: DropdownMenuProps = {
  filterOptions: [
    { name: '1', value: '1' },
    { name: '2', value: '2' },
  ],
  onClick: () => {},
  currentOption: { name: '1', value: '1' },
  dropdownType: 'neutral',
}
export const ListItemCustomizeImage: Story = {
  args: {
    type: 'default',
    children: (
      <ListItemCustomize
        header="Header"
        leftHeaderItem={<img width="60px" height="60px" src={exampleImage} />}
        linkText="Link text"
        label="Label"
        dropdown={dropdownProps}
        onClick={() => {}}
      />
    ),
  },
}
