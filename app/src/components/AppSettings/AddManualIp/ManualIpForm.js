// @flow //
import * as React from 'react'
import { connect } from 'react-redux'
import { getConfig, addManualIp } from '../../../config'
import { startDiscovery } from '../../../discovery'

import { Formik, Form, Field } from 'formik'
import IpField from './IpField'

import type { State, Dispatch } from '../../../types'
import type { DiscoveryCandidates } from '../../../config/types'

type OP = {||}

type SP = {| candidates: DiscoveryCandidates |}

type DP = {| addManualIp: (ip: string) => mixed |}

type Props = { ...SP, ...DP }

class IpForm extends React.Component<Props> {
  inputRef: { current: null | HTMLInputElement }

  constructor(props: Props) {
    super(props)
    this.inputRef = React.createRef()
  }

  render() {
    return (
      <Formik
        initialValues={{ ip: '' }}
        onSubmit={(values, actions) => {
          // trim whitespace and carriage returns
          const ip = values.ip.trim()
          // guard against double submit on enter keypress
          if (!ip) return

          this.props.addManualIp(ip)

          const $input = this.inputRef.current
          if ($input) $input.blur()

          actions.resetForm()
        }}
        render={formProps => {
          return (
            <Form>
              <Field name="ip" component={IpField} inputRef={this.inputRef} />
            </Form>
          )
        }}
      />
    )
  }
}

function mapStateToProps(state: State): SP {
  return {
    candidates: getConfig(state).discovery.candidates,
  }
}

function mapDispatchToProps(dispatch: Dispatch): DP {
  return {
    addManualIp: ip => {
      dispatch(addManualIp(ip))
      dispatch(startDiscovery())
    },
  }
}

export default connect<Props, OP, _, _, _, _>(
  mapStateToProps,
  mapDispatchToProps
)(IpForm)
