// @flow
// Placeholder modal for missing/downloading/errored update files

import * as React from 'react'
import { AlertModal } from '@opentrons/components'
import { ProgressBar } from './progress'
import styles from './styles.css'
import type { ButtonProps } from '@opentrons/components'

type Props = {|
  notNowButton: ButtonProps,
  error: string | null,
  progress: number | null,
|}

export default function DownloadUpdateModal(props: Props) {
  const { notNowButton, error, progress } = props
  const heading = error !== null ? 'Downloading Update' : 'Download Error'

  return (
    <AlertModal
      heading={heading}
      buttons={[notNowButton]}
      restrictOuterScroll={false}
      alertOverlay
    >
      <div className={styles.system_update_modal}>
        {error !== null ? (
          <>
            <p className={styles.download_message}>
              There was an error downloading robot update files:
            </p>
            <p className={styles.download_error}>{error}</p>
            <p>
              To download this update you must be connected to the internet.
            </p>
          </>
        ) : (
          <>
            <p className={styles.download_message}>
              Robot update download in progress...
            </p>
            <ProgressBar progress={progress} />
            <p>
              Please keep app connected to the internet until the download is
              complete.
            </p>
          </>
        )}
      </div>
    </AlertModal>
  )
}
