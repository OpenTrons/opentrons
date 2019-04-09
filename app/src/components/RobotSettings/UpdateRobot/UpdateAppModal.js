// @flow
import * as React from 'react'
import { Link } from 'react-router-dom'

import { AlertModal } from '@opentrons/components'
import UpdateAppMessage from './UpdateAppMessage'
import VersionList from './VersionList'
import SkipAppUpdateMessage from './SkipAppUpdateMessage'

import type { RobotUpdateInfo } from '../../../http-api-client'
import type { VersionProps } from './types'

type Props = {
  updateInfo: RobotUpdateInfo,
  parentUrl: string,
  versionProps: VersionProps,
  ignoreUpdate: () => mixed,
  onClick: () => mixed,
}

export default function UpdateAppModal(props: Props) {
  const { updateInfo, parentUrl, versionProps, onClick, ignoreUpdate } = props
  const HEADING = `Robot Server Version ${
    versionProps.availableUpdate
  } Available`
  const isUpgrade = updateInfo.type === 'upgrade'
  let notNowButton
  if (isUpgrade) {
    notNowButton = {
      onClick: ignoreUpdate,
      children: 'not now',
    }
  } else {
    notNowButton = { Component: Link, to: parentUrl, children: 'not now' }
  }
  return (
    <AlertModal
      heading={HEADING}
      buttons={[
        notNowButton,
        {
          Component: Link,
          to: '/menu/app/update',
          children: 'View App Update',
        },
      ]}
      alertOverlay
    >
      <UpdateAppMessage {...versionProps} />
      <VersionList {...versionProps} />
      <SkipAppUpdateMessage onClick={onClick} />
    </AlertModal>
  )
}
