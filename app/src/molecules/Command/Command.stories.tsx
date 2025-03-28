import uniq from 'lodash/uniq'
import { Command as CommandComponent } from '.'
import * as Fixtures from './__fixtures__'
import type { CommandState } from './Command'
import { customViewports } from '../../../../.storybook/preview'
import type { Meta, StoryObj } from '@storybook/react'
import type { RunTimeCommand } from '@opentrons/shared-data'

type CommandType = RunTimeCommand['commandType']

interface StorybookArgs {
  selectCommandBy: 'protocol index' | 'command type'
  commandIndex: number
  commandType: CommandType
  commandTypeIndex: number
  aligned: 'left' | 'center'
  state: CommandState
}

const availableCommandTypes = uniq(
  Fixtures.mockDoItAllTextData.commands.map(command => command.commandType)
)
const commandsByType: Partial<Record<CommandType, RunTimeCommand[]>> = {}

function commandsOfType(type: CommandType): RunTimeCommand[] {
  if (type in commandsByType) {
    return commandsByType[type]
  }
  commandsByType[type] = Fixtures.mockDoItAllTextData.commands.filter(
    command => command.commandType === type
  )
  return commandsByType[type]
}

function safeCommandOfType(type: CommandType, index: number): RunTimeCommand {
  const commands = commandsOfType(type)
  if (index >= commands.length) {
    return commands.at(-1)
  }
  return commands[index]
}

function Wrapper(props: StorybookArgs): JSX.Element {
  const command =
    props.selectCommandBy === 'protocol index'
      ? Fixtures.mockDoItAllTextData.commands[
          props.commandIndex < Fixtures.mockDoItAllTextData.commands.length
            ? props.commandIndex
            : -1
        ]
      : safeCommandOfType(props.commandType, props.commandTypeIndex)
  return command == null ? null : (
    <CommandComponent
      command={command}
      commandTextData={Fixtures.mockDoItAllTextData}
      robotType="OT-3 Standard"
      state={props.state}
      aligned={props.aligned}
    />
  )
}

const meta: Meta<StorybookArgs> = {
  title: 'App/Molecules/Command/Command',
  component: Wrapper,
  argTypes: {
    selectCommandBy: {
      control: {
        type: 'select',
      },
      options: ['protocol index', 'command type'],
      defaultValue: 'command type',
    },
    commandType: {
      control: {
        type: 'select',
      },
      options: availableCommandTypes,
      defaultValue: 'comment',
      if: { arg: 'selectCommandBy', eq: 'command type' },
    },
    commandTypeIndex: {
      control: {
        type: 'range',
        min: 0,
        max: 100,
      },
      defaultValue: 0,
      if: { arg: 'selectCommandBy', eq: 'command type' },
    },
    commandIndex: {
      control: {
        type: 'range',
        min: 0,
        max: Fixtures.mockDoItAllTextData.commands.length - 1,
      },
      defaultValue: 0,
      if: { arg: 'selectCommandBy', eq: 'protocol index' },
    },
    aligned: {
      control: {
        type: 'select',
      },
      options: ['left', 'center'],
      defaultValue: 'left',
    },
    state: {
      control: {
        type: 'select',
      },
      options: ['current', 'failed', 'future', 'loading'],
      defaultValue: 'current',
    },
  },
  parameters: {
    viewport: {
      viewports: customViewports,
      defaultViewport: 'onDeviceDisplay',
    },
  },
}

export default meta

type Story = StoryObj<typeof Wrapper>

export const PauseCommand: Story = {
  args: {
    selectCommandBy: 'command type',
    commandType: 'waitForResume',
    commandTypeIndex: 0,
    aligned: 'left',
    state: 'current',
  },
}
export const OneLineCommand: Story = {
  args: {
    selectCommandBy: 'command type',
    commandType: 'aspirate',
    commandTypeIndex: 0,
    aligned: 'left',
    state: 'current',
  },
}
export const TwoLineCommand: Story = {
  args: {
    selectCommandBy: 'command type',
    commandType: 'moveLabware',
    commandTypeIndex: 0,
    aligned: 'left',
    state: 'current',
  },
}
export const ThermocyclerProfile: Story = {
  args: {
    selectCommandBy: 'command type',
    commandType: 'thermocycler/runProfile',
    commandTypeIndex: 0,
    aligned: 'left',
    state: 'current',
  },
}

export const ThermocyclerExtendedProfile: Story = {
  args: {
    selectCommandBy: 'command type',
    commandType: 'thermocycler/runExtendedProfile',
    commandTypeIndex: 0,
    aligned: 'left',
    state: 'current',
  },
}

export const VeryLongCommand: Story = {
  args: {
    selectCommandBy: 'command type',
    commandType: 'custom',
    commandTypeIndex: 5,
    aligned: 'left',
    state: 'current',
  },
}
