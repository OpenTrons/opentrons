import React from 'react'
import { useSelector } from 'react-redux'

import { fetchModules, getAttachedModules } from '../../../redux/modules'
import { useDispatchApiRequest } from '../../../redux/robot-api'

import type { AttachedModule } from '../../../redux/modules/types'
import type { State } from '../../../redux/types'

export function useAttachedModules(robotName: string | null): AttachedModule[] {
  const [dispatchRequest] = useDispatchApiRequest()

  const attachedModules = useSelector((state: State) =>
    getAttachedModules(state, robotName)
  )

  React.useEffect(() => {
    if (robotName != null) {
      dispatchRequest(fetchModules(robotName))
    }
  }, [dispatchRequest, robotName])

  return attachedModules
}
