// @flow
import * as React from 'react'
import { Box, SPACING_3 } from '@opentrons/components'
import { getModuleDisplayName } from '@opentrons/shared-data'

import { StatusCard } from './StatusCard'
import { MagnetData, MagnetControl } from '../../../../molecules/ModuleControls'
// import { StatusItem } from './StatusItem'

import type {
  MagneticModule,
  ModuleCommand,
} from '../../../../redux/modules/types'

type Props = {|
  module: MagneticModule,
  isCardExpanded: boolean,
  toggleCard: boolean => mixed,
  sendModuleCommand: (
    moduleId: string,
    command: ModuleCommand,
    args?: Array<mixed>
  ) => mixed,
  controlDisabledReason: string | null,
|}

export const MagDeckCard = ({
  module,
  isCardExpanded,
  toggleCard,
  sendModuleCommand,
  controlDisabledReason,
}: Props): React.Node => (
  <StatusCard
    title={getModuleDisplayName(module.model)}
    isCardExpanded={isCardExpanded}
    toggleCard={toggleCard}
  >
    <Box padding={SPACING_3}>
      <MagnetData module={module} />
      <MagnetControl
        module={module}
        sendModuleCommand={sendModuleCommand}
        disabledReason={controlDisabledReason}
      />
    </Box>
  </StatusCard>
)
