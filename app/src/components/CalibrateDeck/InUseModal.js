// @flow
import * as React from 'react'

import { AlertModal, CheckboxField } from '@opentrons/components'

type Props = {|
  close: () => mixed,
  forceStart: () => mixed,
|}

type State = {|
  checkOne: boolean,
  checkTwo: boolean,
  checkThree: boolean,
|}

const HEADING = 'Robot is currently in use'

export default class InUseModal extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)

    this.state = {
      checkOne: false,
      checkTwo: false,
      checkThree: false,
    }
  }

  render() {
    const { close, forceStart } = this.props
    const canContinue = Object.keys(this.state).every(k => this.state[k])

    return (
      <AlertModal
        heading={HEADING}
        buttons={[
          { children: 'cancel', onClick: close },
          {
            children: 'interrupt',
            onClick: forceStart,
            disabled: !canContinue,
          },
        ]}
      >
        <p>Are you sure you want to interrupt this robot?</p>
        <div>
          <CheckboxField
            label="It can’t be undone"
            onChange={() => this.setState({ checkOne: !this.state.checkOne })}
            value={this.state.checkOne}
          />
          <CheckboxField
            label="Any work the robot is doing will be stopped"
            onChange={() => this.setState({ checkTwo: !this.state.checkTwo })}
            value={this.state.checkTwo}
          />
          <CheckboxField
            label="This is a good idea"
            onChange={() =>
              this.setState({ checkThree: !this.state.checkThree })
            }
            value={this.state.checkThree}
          />
        </div>
      </AlertModal>
    )
  }
}
