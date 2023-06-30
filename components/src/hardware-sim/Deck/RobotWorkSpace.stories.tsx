import * as React from 'react'
import { RobotWorkSpace } from './RobotWorkSpace'
import { RobotCoordsForeignDiv, Module } from '@opentrons/components'
import { getModuleDef2 } from '@opentrons/shared-data'
import { getDeckDefinitions } from './getDeckDefinitions'
import type { INode } from 'svgson'

import type { Story, Meta } from '@storybook/react'

const allDeckDefs = getDeckDefinitions()

const getLayerIds = (layers: INode[]): string[] => {
  return layers.reduce<string[]>((acc, layer) => {
    if (layer.attributes.id) {
      return [...acc, layer.attributes.id]
    }
    return []
  }, [])
}

export default {
  title: 'Library/Molecules/Simulation/Deck',
  argTypes: {
    deckDef: {
      options: Object.keys(allDeckDefs),
      control: {
        type: 'select',
      },
      defaultValue: 'ot2_standard',
    },
    deckLayerBlocklist: {
      options: [
        ...getLayerIds(allDeckDefs.ot2_standard.layers),
        ...getLayerIds(allDeckDefs.ot3_standard.layers),
      ],
      control: {
        type: 'check',
      },
      defaultValue: '',
    },
  },
} as Meta

const Template: Story<React.ComponentProps<typeof RobotWorkSpace>> = ({
  deckDef,
  ...args
}) => {
  const deckLoadName: unknown = deckDef
  const resolvedDef: typeof deckDef = allDeckDefs[deckLoadName as string]
  return <RobotWorkSpace deckDef={resolvedDef} {...args} />
}
export const Deck = Template.bind({})
Deck.args = {
  children: ({ deckSlotsById }) => {
    const divSlot = deckSlotsById['9']
    const moduleSlot = deckSlotsById['10']
    return (
      <>
        <RobotCoordsForeignDiv
          x={divSlot.position[0] - 30}
          y={divSlot.position[1]}
          width={divSlot.boundingBox.xDimension}
          height={divSlot.boundingBox.yDimension}
        >
          <input
            style={{
              backgroundColor: 'lightgray',
              margin: '1rem',
              width: '6rem',
            }}
            placeholder="example input"
          />
        </RobotCoordsForeignDiv>

        <Module
          def={getModuleDef2('temperatureModuleV1')}
          x={moduleSlot.position[0]}
          y={moduleSlot.position[1]}
        />
      </>
    )
  },
}
