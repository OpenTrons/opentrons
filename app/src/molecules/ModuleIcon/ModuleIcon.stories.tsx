import { StyledText } from '../../atoms/text'
import type { AttachedModule } from '../../redux/modules/types'
import { ModuleIcon } from './index'
import {
  Flex,
  SPACING,
  DIRECTION_ROW,
  DIRECTION_COLUMN,
} from '@opentrons/components'
import type { Story, Meta } from '@storybook/react'
import * as React from 'react'

export default {
  title: 'App/Molecules/ModuleIcon',
  component: ModuleIcon,
} as Meta

const temperatureModule = {
  moduleModel: 'temperatureModuleV1',
  moduleType: 'temperatureModuleType',
  data: {},
} as AttachedModule

const magneticModule = {
  moduleModel: 'magneticModuleV1',
  moduleType: 'magneticModuleType',
  data: {},
} as AttachedModule

const thermocyclerModule = {
  moduleModel: 'thermocyclerModuleV1',
  moduleType: 'thermocyclerModuleType',
  data: {},
} as AttachedModule

const heaterShakerModule = {
  moduleModel: 'heaterShakerModuleV1',
  moduleType: 'heaterShakerModuleType',
  data: {},
} as AttachedModule

const modules = [
  temperatureModule,
  magneticModule,
  thermocyclerModule,
  heaterShakerModule,
]

const Template: Story<React.ComponentProps<typeof ModuleIcon>> = args => (
  <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing8}>
    <StyledText>Modules</StyledText>
    <Flex flexDirection={DIRECTION_ROW} gridGap={SPACING.spacing8}>
      {modules.map((module, i) => (
        <ModuleIcon
          key={`module-${i}`}
          module={module}
          tooltipText={module.moduleModel}
        />
      ))}
    </Flex>
  </Flex>
)

export const Primary = Template.bind({})
Primary.args = {}
