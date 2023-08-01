import * as React from 'react'

import { useEstopQuery } from '@opentrons/react-api-client'

import { EstopPressedModal } from './EstopPressedModal'
import { EstopMissingModal } from './EstopMissingModal'
import { useEstopContext } from './hooks'
import {
  PHYSICALLY_ENGAGED,
  LOGICALLY_ENGAGED,
  NOT_PRESENT,
  DISENGAGED,
} from './constants'

const ESTOP_REFETCH_INTERVAL_MS = 10000

interface EstopTakeoverProps {
  robotName: string
}

export function EstopTakeover({ robotName }: EstopTakeoverProps): JSX.Element {
  const { data: estopStatus } = useEstopQuery({
    refetchInterval: ESTOP_REFETCH_INTERVAL_MS,
  })
  const [showEstopModal, setShowEstopModal] = React.useState<boolean>(false)
  const { isDismissedModal, setIsDismissedModal } = useEstopContext()

  const closeModal = (): void => {
    if (estopStatus?.data.status === DISENGAGED) {
      setShowEstopModal(false)
    }
  }

  const targetEstopModal = (): JSX.Element | null => {
    switch (estopStatus?.data.status) {
      case PHYSICALLY_ENGAGED:
      case LOGICALLY_ENGAGED:
        return (
          <EstopPressedModal
            isEngaged={estopStatus?.data.status === PHYSICALLY_ENGAGED}
            closeModal={closeModal}
            isDismissedModal={isDismissedModal}
            setIsDismissedModal={setIsDismissedModal}
          />
        )
      case NOT_PRESENT:
        return (
          <EstopMissingModal
            robotName={robotName}
            closeModal={closeModal}
            isDismissedModal={isDismissedModal}
            setIsDismissedModal={setIsDismissedModal}
          />
        )
      default:
        return null
    }
  }

  React.useEffect(() => {
    console.log('useEffect', isDismissedModal)
    setIsDismissedModal(isDismissedModal)
    if (!isDismissedModal) {
      setShowEstopModal(true)
    }
  }, [isDismissedModal, setIsDismissedModal, showEstopModal])

  return <>{showEstopModal ? targetEstopModal() : null}</>
}
