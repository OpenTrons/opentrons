import { css } from 'styled-components'

import { Flex, VIEWPORT } from '@opentrons/components'

import { SubListTable as SubListTableComponent } from './index'

import type { ComponentProps } from 'react'
import type { Story, Meta } from '@storybook/react'

export default {
  title: 'Library/Atoms/SubListTable',
  component: SubListTableComponent,
  argTypes: {
    headers: {
      control: 'array',
      description: 'Headers for the list table',
    },
    tagCount: {
      control: { type: 'range', min: 1, max: 99, step: 1 },
      description:
        'Number of Tag components to include as example child components.',
    },
    devNote: {
      description:
        'Use SubListTable only when there should a table-esque component in a real table (ListTable), otherwise use ListTable.',
    },
  },
  parameters: VIEWPORT.touchScreenViewport,
} as Meta

interface SubListTableStoryProps
  extends ComponentProps<typeof SubListTableComponent> {
  tagCount: number
}

const Template: Story<SubListTableStoryProps> = args => {
  const { tagCount, ...subListTableProps } = args

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  const renderTags = () => {
    return Array.from({ length: tagCount }, (_, i) => {
      return (
        <Flex key={`tag-${i}`} width="100%">
          <Flex css={CHILD_STYLE}>Child Component</Flex>
        </Flex>
      )
    })
  }

  return (
    <SubListTableComponent {...subListTableProps}>
      {renderTags()}
    </SubListTableComponent>
  )
}

export const SubListTable = Template.bind({})
SubListTable.args = {
  headers: ['Name', 'Type', 'Description'],
  tagCount: 3,
}

export const SubListTableNoHeader = Template.bind({})
SubListTableNoHeader.args = {
  tagCount: 3,
}

const CHILD_STYLE = css`
  width: 100%;
  background-color: #a864ff10;
  border: 2px dashed #a864ff;
`
