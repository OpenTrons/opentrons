// @flow
import * as React from 'react'
import {Link} from 'react-router-dom'

import SyncRobotMessage from './SyncRobotMessage'
import VersionList from './VersionList'
import {ScrollableAlertModal} from '../../modals'
import ReleaseNotes from '../../ReleaseNotes'

import {API_RELEASE_NOTES} from '../../../shell'

import type {VersionProps} from './types'
import type {RobotUpdateInfo} from '../../../http-api-client'
import type {ButtonProps} from '@opentrons/components'
type Props = {
  versionProps: VersionProps,
  updateInfo: RobotUpdateInfo,
  parentUrl: string,
  ignoreUpdate: () => mixed,
  update: () => mixed,
}

type SyncRobotState = {
  showReleaseNotes: boolean,
}

export default class SyncRobotModal extends React.Component<
  Props,
  SyncRobotState
> {
  constructor (props: Props) {
    super(props)
    this.state = {showReleaseNotes: false}
  }

  setShowReleaseNotes = () => {
    this.setState({showReleaseNotes: true})
  }

  render () {
    const {
      updateInfo,
      versionProps,
      update,
      ignoreUpdate,
      parentUrl,
    } = this.props
    const {availableUpdate} = versionProps
    const {showReleaseNotes} = this.state

    const heading = `Version ${availableUpdate} available`
    let buttons: Array<?ButtonProps>

    if (showReleaseNotes) {
      buttons = [
        {onClick: ignoreUpdate, children: 'not now'},
        {
          children: 'Update Robot Server',
          onClick: update,
        },
      ]
    } else if (updateInfo.type === 'upgrade') {
      buttons = [
        {onClick: ignoreUpdate, children: 'not now'},
        {
          children: 'View Robot Server Update',
          onClick: this.setShowReleaseNotes,
        },
      ]
    } else if (updateInfo.type === 'downgrade') {
      buttons = [
        {Component: Link, to: parentUrl, children: 'not now'},
        {
          children: 'Downgrade Robot',
          onClick: update,
        },
      ]
    }

    return (
      <ScrollableAlertModal
        heading={heading}
        buttons={buttons}
        alertOverlay
        key={String(showReleaseNotes)}
      >
        {showReleaseNotes ? (
          <ReleaseNotes source={API_RELEASE_NOTES} />
        ) : (
          <React.Fragment>
            <SyncRobotMessage
              updateInfo={updateInfo}
              // TODO fix this to only be available robot version
              appVersion={availableUpdate}
            />
            <VersionList {...versionProps} ignoreAppUpdate />
          </React.Fragment>
        )}
      </ScrollableAlertModal>
    )
  }
}
