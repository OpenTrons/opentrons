// @flow
// app info card with version and updated
import * as React from 'react'
import { connect } from 'react-redux'
import { withRouter, Route, Link } from 'react-router-dom'

import { getConfig, updateConfig, toggleDevTools } from '../../config'
import { Card } from '@opentrons/components'
import { LabeledToggle, LabeledSelect, LabeledButton } from '../controls'
import AddManualIp from './AddManualIp'

import type { ContextRouter } from 'react-router'
import type { State, Dispatch } from '../../types'
import type { UpdateChannel } from '../../config'

type OP = {
  ...ContextRouter,
  checkUpdate: () => mixed,
}

type SP = {|
  devToolsOn: boolean,
  channel: UpdateChannel,
|}

type DP = {|
  toggleDevTools: () => mixed,
  handleChannel: (event: SyntheticInputEvent<HTMLSelectElement>) => mixed,
|}

type Props = { ...$Exact<OP>, ...SP, ...DP }

const TITLE = 'Advanced Settings'

// TODO(mc, 2018-08-03): enable "alpha" option
const CHANNEL_OPTIONS = [
  { name: 'Stable', value: (('latest': UpdateChannel): string) },
  { name: 'Beta', value: (('beta': UpdateChannel): string) },
]

export default withRouter(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )(AdvancedSettingsCard)
)

function AdvancedSettingsCard(props: Props) {
  return (
    <React.Fragment>
      <Card title={TITLE}>
        <LabeledSelect
          label="Update Channel"
          value={props.channel}
          options={CHANNEL_OPTIONS}
          onChange={props.handleChannel}
        >
          <p>
            Sets the update channel of your app. &quot;Stable&quot; receives the
            latest stable releases. &quot;Beta&quot; is updated more frequently
            so you can try out new features, but the releases may be less well
            tested than &quot;Stable&quot;.
          </p>
        </LabeledSelect>
        <LabeledToggle
          label="Enable Developer Tools"
          toggledOn={props.devToolsOn}
          onClick={props.toggleDevTools}
        >
          <p>
            Requires restart. Turns on the app&#39;s developer tools, which
            provide access to the inner workings of the app and additional
            logging.
          </p>
        </LabeledToggle>
        <LabeledButton
          label="Manually Add Robot Network Addresses"
          buttonProps={{
            Component: Link,
            children: 'manage',
            to: `${props.match.url}/add-ip`,
          }}
        >
          <p>
            If your app is unable to automatically discover your robot, you can
            manually add its IP address or hostname here
          </p>
        </LabeledButton>
      </Card>
      <Route
        path={`${props.match.path}/add-ip`}
        render={() => <AddManualIp backUrl={props.match.url} />}
      />
    </React.Fragment>
  )
}

function mapStateToProps(state: State): SP {
  const config = getConfig(state)

  return {
    devToolsOn: config.devtools,
    channel: config.update.channel,
  }
}

function mapDispatchToProps(dispatch: Dispatch, ownProps: OP) {
  return {
    toggleDevTools: () => dispatch(toggleDevTools()),
    handleChannel: event => {
      dispatch(updateConfig('update.channel', event.target.value))

      // TODO(mc, 2018-08-03): refactor app update interface to be more
      // reactive and teach it to re-check on release channel change
      setTimeout(ownProps.checkUpdate, 500)
    },
  }
}
