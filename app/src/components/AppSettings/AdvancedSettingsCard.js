// @flow
// app info card with version and updated
import * as React from 'react'
import { useSelector, useDispatch } from 'react-redux'
import startCase from 'lodash/startCase'
import { Card, LabeledToggle, LabeledSelect } from '@opentrons/components'
import type { DropdownOption } from '@opentrons/components'
import type { DevInternalFlag } from '../../config/types'
import type { Dispatch } from '../../types'
import * as Config from '../../config'
import * as Calibration from '../../calibration'

const TITLE = 'Advanced Settings'

const USE_TRASH_SURFACE_TIP_CAL_LABEL =
  'Use Trash Bin surface for tip calibration'
const USE_TRASH_SURFACE_TIP_CAL_BODY =
  "Tip length calibration should be performed using a Calibration Block. If you don't have one, use this option"

const UPDATE_CHANNEL_LABEL = 'Update Channel'
const UPDATE_CHANNEL_BODY =
  'Sets the update channel of your app. "Stable" receives the latest stable releases. "Beta" is updated more frequently so you can try out new features, but the releases may be less well tested than "Stable".'

const ENABLE_DEV_TOOLS_LABEL = 'Enable Developer Tools'
const ENABLE_DEV_TOOLS_BODY =
  "Requires restart. Turns on the app's developer tools, which provide access to the inner workings of the app and additional logging."

const DEV_TITLE = 'Developer Only (unstable)'

type Props = {|
  checkUpdate: () => void,
|}

export function AdvancedSettingsCard(props: Props): React.Node {
  const useTrashSurfaceForTipCal = useSelector(
    Config.getUseTrashSurfaceForTipCal
  )
  const devToolsOn = useSelector(Config.getDevtoolsEnabled)
  const devInternalFlags = useSelector(Config.getFeatureFlags)
  const channel = useSelector(Config.getUpdateChannel)
  const channelOptions: Array<DropdownOption> = useSelector(
    Config.getUpdateChannelOptions
  )
  const dispatch = useDispatch<Dispatch>()

  const toggleUseTrashForTipCal = () =>
    dispatch(Calibration.toggleUseTrashSurfaceForTipCal())
  const toggleDevtools = () => dispatch(Config.toggleDevtools())
  const toggleDevInternalFlag = (flag: DevInternalFlag) =>
    dispatch(Config.toggleDevInternalFlag(flag))
  const handleChannel = event =>
    dispatch(Config.updateConfigValue('update.channel', event.target.value))

  React.useEffect(props.checkUpdate, [channel])

  return (
    <>
      <Card title={TITLE}>
        {devInternalFlags?.enableCalibrationOverhaul &&
          useTrashSurfaceForTipCal != null && (
            <LabeledToggle
              data-test="useTrashSurfaceForTipCalToggle"
              label={USE_TRASH_SURFACE_TIP_CAL_LABEL}
              toggledOn={useTrashSurfaceForTipCal}
              onClick={toggleUseTrashForTipCal}
            >
              <p>{USE_TRASH_SURFACE_TIP_CAL_BODY}</p>
            </LabeledToggle>
          )}
        <LabeledSelect
          data-test="updateChannelSetting"
          label={UPDATE_CHANNEL_LABEL}
          value={channel}
          options={channelOptions}
          onChange={handleChannel}
        >
          <p>{UPDATE_CHANNEL_BODY}</p>
        </LabeledSelect>
        <LabeledToggle
          data-test="enableDevToolsToggle"
          label={ENABLE_DEV_TOOLS_LABEL}
          toggledOn={devToolsOn}
          onClick={toggleDevtools}
        >
          <p>{ENABLE_DEV_TOOLS_BODY}</p>
        </LabeledToggle>
      </Card>
      {devToolsOn && (
        <Card title={DEV_TITLE}>
          {Config.DEV_INTERNAL_FLAGS.map(flag => (
            <LabeledToggle
              key={flag}
              data-test={`devInternalToggle${flag}`}
              label={`__DEV__ ${startCase(flag)}`}
              toggledOn={Boolean(devInternalFlags?.[flag])}
              onClick={() => toggleDevInternalFlag(flag)}
            />
          ))}
        </Card>
      )}
    </>
  )
}
