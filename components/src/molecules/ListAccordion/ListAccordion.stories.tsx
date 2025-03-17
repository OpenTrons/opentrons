import { css } from 'styled-components'

import {
  Flex,
  Tag,
  Icon,
  VIEWPORT,
  RESPONSIVENESS,
} from '@opentrons/components'

import { ListAccordion as ListAccordionComponent } from '.'
import { DISPLAY_FLEX, DISPLAY_GRID } from '../../styles'

import type { ComponentProps } from 'react'
import type { Story, Meta } from '@storybook/react'

export default {
  title: 'Helix/Molecules/ListAccordion',
  component: ListAccordionComponent,
  argTypes: {
    alertKind: {
      control: 'radio',
      options: ['default', 'warning'],
      description: 'Kind of alert, changes background color',
    },
    icon: {
      control: 'text',
      description:
        'Name of icon to display (only shown when alertKind is default). Note that in code that a full Icon child component is passed, not a string.',
    },
    tagCount: {
      control: { type: 'range', min: 1, max: 99, step: 1 },
      description:
        'Number of Tag components to include as example child components.',
    },
    headerText: {
      control: 'text',
      description:
        'Text to display in the example Tag component header. NOTE: This is for Storybook ease-of-use only and overrides the "headerChild" behavior (which is what is used in practice in code).',
    },
    headerChild: {
      control: '',
      description: 'See header text. Does nothing in Storybook.',
    },
  },
  parameters: VIEWPORT.touchScreenViewport,
} as Meta

interface ListAccordionStoryProps
  extends Omit<
    ComponentProps<typeof ListAccordionComponent>,
    'headerChild' | 'children'
  > {
  tagCount: number
  headerText: string
}

const Template: Story<ListAccordionStoryProps> = args => {
  const { tagCount, headerText, icon, ...listAccordionProps } = args

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  const renderRows = () => {
    const rows = []
    for (let i = 0; i < tagCount; i++) {
      rows.push(
        // @ts-expect-error Works.
        <tr key={`tag-${i}`} css={TR_STYLE}>
          {/* @ts-expect-error Works. */}
          <td css={TD_STYLE}>
            <Flex css={FLEX_STYLE}>
              <Tag
                text={`Tag ${i + 1}`}
                type="default"
                iconName={i % 2 === 0 ? 'alert-circle' : 'check-circle'}
                iconPosition={i % 2 === 0 ? 'left' : 'right'}
              />
            </Flex>
          </td>
        </tr>
      )
    }
    return rows
  }

  return (
    <ListAccordionComponent
      {...listAccordionProps}
      headerChild={<Tag text={headerText} type="default" />}
      // @ts-expect-error For storybook only, specify the icon name for convenience.
      icon={icon != null ? <Icon name={icon} css={ICON_STYLE} /> : null}
    >
      {renderRows()}
    </ListAccordionComponent>
  )
}

export const ListAccordion = Template.bind({})
ListAccordion.args = {
  alertKind: 'default',
  tagCount: 5,
  headerText: 'Example Header',
  tableHeaders: ['Name', 'Status', 'Description'],
}

const TR_STYLE = css`
  width: 100%;
  display: ${DISPLAY_GRID};
  grid-template-columns: 1fr;
`

const TD_STYLE = css`
  width: 100%;
`

const FLEX_STYLE = css`
  width: 100%;
  display: ${DISPLAY_FLEX};
`

const ICON_STYLE = css`
  height: 20px;
  width: 20px;

  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    height: 32px;
    width: 32px;
  }
`
