import * as React from 'react'
import { useSelector, useDispatch } from 'react-redux'
import startCase from 'lodash/startCase'
import {
  Flex,
  Box,
  Text,
  ALIGN_CENTER,
  JUSTIFY_SPACE_BETWEEN,
  SPACING,
  TYPOGRAPHY,
  COLORS,
} from '@opentrons/components'
import type { Dispatch } from '../../redux/types'
import * as Config from '../../redux/config'

import { AppSettingsHeader } from './AppSettingsHeader'
import type { DevInternalFlag } from '../../redux/config/types'
import { Divider } from '../../atoms/structure'
import { ToggleButton } from '../../atoms/Buttons'

export function FeatureFlags(): JSX.Element {
  const devInternalFlags = useSelector(Config.getFeatureFlags)
  const dispatch = useDispatch<Dispatch>()
  const toggleDevInternalFlag = (flag: DevInternalFlag): unknown =>
    dispatch(Config.toggleDevInternalFlag(flag))
  console.log(Config.DEV_INTERNAL_FLAGS)

  return (
    <Box backgroundColor={COLORS.white} height="100%">
      <AppSettingsHeader page="featureFlags" />
      <Box paddingX={SPACING.spacing4} paddingY={SPACING.spacing5}>
        {Config.DEV_INTERNAL_FLAGS.map((flag, index) => (
          <>
            <Flex
              alignItems={ALIGN_CENTER}
              justifyContent={JUSTIFY_SPACE_BETWEEN}
              key={flag}
            >
              <Text css={TYPOGRAPHY.h3SemiBold}>{startCase(flag)}</Text>
              <ToggleButton
                label={`${flag}-toggle`}
                toggledOn={Boolean(devInternalFlags?.[flag])}
                onClick={() => dispatch(() => toggleDevInternalFlag(flag))}
              />
            </Flex>
            {index !== Config.DEV_INTERNAL_FLAGS.length - 1 && (
              <Divider marginY={SPACING.spacing5} />
            )}
          </>
        ))}
      </Box>
    </Box>
  )
}
