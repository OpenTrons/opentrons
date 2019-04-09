// @flow
// app info card with version and updated
import * as React from 'react'
import { Link } from 'react-router-dom'

import { CURRENT_VERSION } from '../../shell'
import { RefreshCard, LabeledValue, OutlineButton } from '@opentrons/components'
import { CardContentHalf } from '../layout'

import styles from './styles.css'

type Props = {
  availableVersion: ?string,
  checkUpdate: () => mixed,
}

const TITLE = 'Information'
const VERSION_LABEL = 'Software Version'

const UPDATE_AVAILABLE = 'view available update'
const UPDATE_NOT_AVAILABLE = 'up to date'

export default function AppInfoCard(props: Props) {
  const { checkUpdate, availableVersion } = props

  return (
    <RefreshCard refresh={checkUpdate} title={TITLE}>
      <CardContentHalf>
        <LabeledValue label={VERSION_LABEL} value={CURRENT_VERSION} />
      </CardContentHalf>
      <CardContentHalf>
        <OutlineButton
          Component={Link}
          to="/menu/app/update"
          disabled={!availableVersion}
          className={styles.show_update_button}
        >
          {availableVersion ? UPDATE_AVAILABLE : UPDATE_NOT_AVAILABLE}
        </OutlineButton>
      </CardContentHalf>
    </RefreshCard>
  )
}
