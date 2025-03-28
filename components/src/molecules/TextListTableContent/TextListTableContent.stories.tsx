import { css } from 'styled-components'

import { TextListTableContent as TextListTableContentComponent } from '.'
import { StyledText } from '../../atoms'
import { DISPLAY_GRID } from '../../styles'
import { SPACING, VIEWPORT } from '../../ui-style-constants'

import type { ComponentProps } from 'react'
import type { Story, Meta } from '@storybook/react'

export default {
  title: 'Helix/Molecules/TextListTableContent',
  component: TextListTableContentComponent,
  argTypes: {
    header: {
      control: 'text',
      description: 'The text that appears above the table',
    },
    listTableHeaders: {
      control: 'array',
      description: 'Headers for the list table',
    },
    rowCount: {
      control: { type: 'range', min: 1, max: 99, step: 1 },
      description:
        'For Storybook only. Number of lorem ipsum text rows to display in the table. ',
    },
  },
  parameters: VIEWPORT.touchScreenViewport,
} as Meta

interface TextListTableContentStoryProps
  extends Omit<
    ComponentProps<typeof TextListTableContentComponent>,
    'children'
  > {
  rowCount: number
}

const loremIpsumSentences = [
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
  'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.',
  'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum.',
  'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia.',
  'At vero eos et accusamus et iusto odio dignissimos ducimus.',
  'Nam libero tempore, cum soluta nobis est eligendi optio cumque.',
  'Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus.',
]

const Template: Story<TextListTableContentStoryProps> = args => {
  const { rowCount, ...textListTableContentProps } = args
  const numColumns = textListTableContentProps.listTableHeaders
    ? textListTableContentProps.listTableHeaders.filter(Boolean).length
    : 1

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  const renderRows = () => {
    return Array.from({ length: rowCount }, (_, i) => {
      return (
        // @ts-expect-error Works.
        <tr key={`row-${i}`} css={rowStyle(numColumns)}>
          {Array.from({ length: numColumns }, (_, j) => {
            const textIndex = (i + j) % loremIpsumSentences.length
            return (
              <td key={`cell-${i}-${j}`}>
                <StyledText
                  oddStyle="bodyTextRegular"
                  desktopStyle="bodyDefaultRegular"
                >
                  {loremIpsumSentences[textIndex]}
                </StyledText>
              </td>
            )
          })}
        </tr>
      )
    })
  }

  return (
    <TextListTableContentComponent {...textListTableContentProps}>
      {renderRows()}
    </TextListTableContentComponent>
  )
}

export const TextListTableContent = Template.bind({})
TextListTableContent.args = {
  header: 'Example Table Header',
  listTableHeaders: ['Column 1', 'Column 2', 'Column 3'],
  rowCount: 5,
}

export const TextListTableContentSingleColumn = Template.bind({})
TextListTableContentSingleColumn.args = {
  header: 'Example Single Column Table',
  listTableHeaders: ['Column 1'],
  rowCount: 5,
}

export const TextListTableContentNoHeader = Template.bind({})
TextListTableContentNoHeader.args = {
  header: 'Example Table Without Column Headers',
  rowCount: 5,
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const rowStyle = (numColumns: number) => css`
  display: ${DISPLAY_GRID};
  grid-template-columns: repeat(${numColumns}, 1fr);
  gap: ${SPACING.spacing24};
  width: 100%;
`
