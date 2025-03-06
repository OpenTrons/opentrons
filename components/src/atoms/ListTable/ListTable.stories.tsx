import { css } from 'styled-components'

import { Flex, VIEWPORT } from '@opentrons/components'

import { ListTable as ListTableComponent } from '.'

import type { ComponentProps } from 'react'
import type { Story, Meta } from '@storybook/react'

export default {
  title: 'Library/Atoms/ListTable',
  component: ListTableComponent,
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
        'Prefer this component over SubListTable, since it contains the semantic HTML table tags. Include tr tags in the children when applicable. If a table is nested in ListTable, use SubListTable for the nested table.',
    },
  },
  parameters: VIEWPORT.touchScreenViewport,
} as Meta

interface ListTableStoryProps
  extends ComponentProps<typeof ListTableComponent> {
  tagCount: number
}

const Template: Story<ListTableStoryProps> = args => {
  const { tagCount, ...listTableProps } = args

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  const renderRows = () => {
    return Array.from({ length: tagCount }, (_, i) => {
      return (
        <Flex key={`tag-${i}`} width="100%">
          <Flex css={CHILD_STYLE}>Child Component</Flex>
        </Flex>
      )
    })
  }

  return (
    <ListTableComponent {...listTableProps}>{renderRows()}</ListTableComponent>
  )
}

export const ListTable = Template.bind({})
ListTable.args = {
  headers: ['Name', 'Type', 'Description'],
  tagCount: 3,
}

export const ListTableNoHeader = Template.bind({})
ListTableNoHeader.args = {
  tagCount: 3,
}

const CHILD_STYLE = css`
  width: 100%;
  background-color: #a864ff10;
  border: 2px dashed #a864ff;
`
