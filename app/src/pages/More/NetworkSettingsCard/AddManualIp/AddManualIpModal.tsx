import * as React from 'react'

import { AlertModal } from '@opentrons/components'
import { Portal } from '../../../../App/portal'
import { ManualIpForm } from './ManualIpForm'
import { IpList } from './IpList'

export interface AddManualIpProps {
  closeModal: () => unknown
}

export function AddManualIpModal(props: AddManualIpProps): JSX.Element {
  return (
    <Portal>
      <AlertModal
        alertOverlay
        iconName="wifi"
        heading="Manually Add Robot Network Addresses"
        buttons={[{ onClick: props.closeModal, children: 'Done' }]}
      >
        <p>
          Enter an IP address or hostname to connect to your robot if automatic
          discovery is not working. For this feature to work reliably, you (or
          your network administrator) should assign a static IP address to your
          robot.
        </p>
        <ManualIpForm />
        <IpList />
      </AlertModal>
    </Portal>
  )
}
