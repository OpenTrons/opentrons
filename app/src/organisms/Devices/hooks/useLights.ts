import { useSelector } from 'react-redux'

import { useDispatchApiRequest } from '../../../redux/robot-api'
import { updateLights, getLightsOn } from '../../../redux/robot-controls'

import type { State } from '../../../redux/types'

export function useLights(
  robotName: string
): { lightsOn: boolean | null; toggleLights: () => void } {
  const [dispatchRequest] = useDispatchApiRequest()

  const lightsOn = useSelector((state: State) => getLightsOn(state, robotName))

  const toggleLights = (): void => {
    dispatchRequest(updateLights(robotName, !lightsOn))
  }

  return { lightsOn, toggleLights }
}
