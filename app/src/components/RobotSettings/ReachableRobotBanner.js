// @flow
import * as React from 'react'
import {type Robot} from '../../robot'
import {AlertItem} from '@opentrons/components'

type State = {
  dismissed: boolean,
}

export default class ReachableRobotBanner extends React.Component<
  Robot,
  State
> {
  constructor (props: Robot) {
    super(props)

    this.state = {
      dismissed: false,
    }
  }

  render () {
    const {serverOk} = this.props
    const isVisible = !this.state.dismissed
    const TITLE = 'Unable to establish connection with robot'
    const NO_SERVER_MESSAGE =
      'Robot is advertising but cannot boot any of its servers.'
    const SERVER_MESSAGE =
      'Robot is advertising and can only boot update server'
    const message = serverOk ? SERVER_MESSAGE : NO_SERVER_MESSAGE
    if (!isVisible) {
      return null
    }
    return (
      <AlertItem
        type="warning"
        onCloseClick={() => this.setState({dismissed: true})}
        title={TITLE}
      >
        {message}
      </AlertItem>
    )
  }
}
