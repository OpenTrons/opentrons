import { useState, useCallback } from 'react'
import last from 'lodash/last'

import { useDispatchApiRequest } from '/app/redux/robot-api'
import { updateModule } from '/app/redux/modules'

import magneticModule from '/app/assets/images/magnetic_module_gen_2_transparent.png'
import temperatureModule from '/app/assets/images/temp_deck_gen_2_transparent.png'
import thermoModuleGen1Closed from '/app/assets/images/thermocycler_closed.png'
import thermoModuleGen1Opened from '/app/assets/images/thermocycler_open_transparent.png'
import heaterShakerModule from '/app/assets/images/heater_shaker_module_transparent.png'
import thermoModuleGen2Closed from '/app/assets/images/thermocycler_gen_2_closed.png'
import thermoModuleGen2Opened from '/app/assets/images/thermocycler_gen_2_opened.png'
import absorbanceReader from '/app/assets/images/opentrons_plate_reader.png'
// TODO (sb, 1/25): add correct flex stacker asset when it exits
import flexStacker from '/app/assets/images/FLEX.png'

import type { AttachedModule } from '/app/redux/modules/types'

export function getModuleCardImage(attachedModule: AttachedModule): string {
  //  TODO(jr, 9/22/22): add images for V1 of magneticModule and temperatureModule
  switch (attachedModule.moduleModel) {
    // TODO: Add correct image for flex stacker
    case 'magneticModuleV1':
    case 'magneticModuleV2':
      return magneticModule
    case 'temperatureModuleV1':
    case 'temperatureModuleV2':
      return temperatureModule
    case 'heaterShakerModuleV1':
      return heaterShakerModule
    case 'thermocyclerModuleV1':
      if (attachedModule.data.lidStatus === 'closed') {
        return thermoModuleGen1Closed
      } else {
        return thermoModuleGen1Opened
      }
    case 'thermocyclerModuleV2':
      if (attachedModule.data.lidStatus === 'closed') {
        return thermoModuleGen2Closed
      } else {
        return thermoModuleGen2Opened
      }
    case 'absorbanceReaderV1':
      return absorbanceReader
    case 'flexStackerModuleV1':
      return flexStacker
    //  this should never be reached
    default:
      return 'unknown module model, this is an error'
  }
}

type RequestIdsBySerialNumber = Record<string, string[]>
type HandleModuleApiRequestsType = (robotName: string, moduleId: string) => void
type GetLatestRequestIdType = (moduleId: string) => string | null

export function useModuleApiRequests(): [
  GetLatestRequestIdType,
  HandleModuleApiRequestsType
] {
  const [dispatchApiRequest] = useDispatchApiRequest()
  const [
    requestIdsBySerial,
    setRequestIdsBySerial,
  ] = useState<RequestIdsBySerialNumber>({})

  const handleModuleApiRequests = (
    robotName: string,
    serialNumber: string
  ): void => {
    const action = dispatchApiRequest(updateModule(robotName, serialNumber))
    const { requestId } = action.meta

    if (requestId != null) {
      if (serialNumber in requestIdsBySerial) {
        setRequestIdsBySerial((prevState: RequestIdsBySerialNumber) => {
          const existingRequestIds = prevState[serialNumber] || []
          return {
            ...prevState,
            [serialNumber]: [...existingRequestIds, requestId],
          }
        })
      } else {
        setRequestIdsBySerial(prevState => {
          return {
            ...prevState,
            [serialNumber]: [requestId],
          }
        })
      }
    }
  }

  const getLatestRequestId = useCallback(
    (serialNumber: string): string | null => {
      if (serialNumber in requestIdsBySerial) {
        return last(requestIdsBySerial[serialNumber]) ?? null
      } else {
        return null
      }
    },
    [requestIdsBySerial]
  )

  return [getLatestRequestId, handleModuleApiRequests]
}
