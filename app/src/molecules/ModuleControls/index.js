// @flow
import * as React from 'react'

import {
  COLOR_SUCCESS,
  Box,
  Flex,
  Icon,
  Text,
  TEXT_TRANSFORM_CAPITALIZE,
  ALIGN_CENTER,
  JUSTIFY_SPACE_BETWEEN,
  COLOR_WARNING_LIGHT,
  FONT_SIZE_BODY_1,
  DIRECTION_COLUMN,
} from '@opentrons/components'
import { TemperatureControl } from './TemperatureControl'
import { MagnetControl } from './MagnetControl'
import { MagnetData } from './MagnetData'
import {
  MAGNETIC_MODULE_TYPE,
  THERMOCYCLER_MODULE_TYPE,
  useSendModuleCommand,
} from '../../redux/modules'
import { TemperatureData } from './TemperatureData'

import type {
  MagneticModule,
  TemperatureModule,
  ThermocyclerModule,
} from '../../redux/modules/types'

type Props = {|
  module: MagneticModule | TemperatureModule | ThermocyclerModule,
  controlDisabledReason: string | null,
|}

export function ModuleControls(props: Props): React.Node {
  const { module: mod, controlDisabledReason } = props
  const sendModuleCommand = useSendModuleCommand()
  return (
    <Flex justifyContent={JUSTIFY_SPACE_BETWEEN}>
      {mod.type === MAGNETIC_MODULE_TYPE ? (
        <>
          <MagnetData module={mod} />
          <MagnetControl
            module={mod}
            sendModuleCommand={sendModuleCommand}
            disabledReason={controlDisabledReason}
          />
        </>
      ) : (
        <>
          <Box width="100%">
            {mod.type === THERMOCYCLER_MODULE_TYPE && (
              <Flex justifyContent={JUSTIFY_SPACE_BETWEEN}>
                <TemperatureData
                  current={mod.data.lidTemp}
                  target={mod.data.lidTarget}
                  title="lid"
                />
                <TemperatureControl
                  module={mod}
                  isSecondaryTemp={true}
                  sendModuleCommand={sendModuleCommand}
                  disabledReason={controlDisabledReason}
                />
              </Flex>
            )}
            <Flex justifyContent={JUSTIFY_SPACE_BETWEEN}>
              <TemperatureData
                status={mod.status}
                current={mod.data.currentTemp}
                target={mod.data.targetTemp}
                title={mod.type === THERMOCYCLER_MODULE_TYPE ? 'block' : null}
              />
              <TemperatureControl
                  module={mod}
                  isSecondaryTemp={false}
                  sendModuleCommand={sendModuleCommand}
                  disabledReason={controlDisabledReason}
                />
            </Flex>
          </Box>
        </>
      )}
    </Flex>
  )
}

export { TemperatureControl, TemperatureData, MagnetData, MagnetControl }
