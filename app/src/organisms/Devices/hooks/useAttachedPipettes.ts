import React from 'react'
import { useSelector } from 'react-redux'

import { fetchPipettes, getAttachedPipettes } from '../../../redux/pipettes'
import { useDispatchApiRequest } from '../../../redux/robot-api'
import { useRobot } from '.'

import type { AttachedPipettesByMount } from '../../../redux/pipettes/types'
import type { State } from '../../../redux/types'

export function useAttachedPipettes(
  robotName: string | null
): AttachedPipettesByMount {
  const [dispatchRequest] = useDispatchApiRequest()

  const robot = useRobot(robotName)

  const attachedPipettes = useSelector((state: State) =>
    getAttachedPipettes(state, robotName)
  )

  React.useEffect(() => {
    if (robotName != null) {
      dispatchRequest(fetchPipettes(robotName))
    }
  }, [dispatchRequest, robotName, robot?.status])

  return attachedPipettes
}
