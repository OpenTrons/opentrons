import * as React from 'react'
import head from 'lodash/head'

import { getPipetteModelSpecs } from '@opentrons/shared-data'

import { DropTipWizard } from './DropTipWizard'
import { getPipettesWithTipAttached } from './getPipettesWithTipAttached'
import {type ErrorDetails, useDropTipCommands, useDropTipRouting} from './utils'

import type { PipetteModelSpecs, RobotType } from '@opentrons/shared-data'
import type { GetPipettesWithTipAttached } from './getPipettesWithTipAttached'
import type { PipetteData } from '@opentrons/api-client'

export interface PipetteWithTip {
  mount: 'left' | 'right'
  specs: PipetteModelSpecs
}

interface TipAttachmentStatusResult {
  /** Updates the pipettes with tip cache. Determine whether tips are likely attached on one or more pipettes.
   *
   * NOTE: Use responsibly! This function can potentially (but not likely) iterate over the entire length of a protocol run.
   * */
  determineTipStatus: () => Promise<void>
  /** Whether tips are likely attached on *any* pipette. Typically called after determineTipStatus() */
  areTipsAttached: boolean
  /** Resets the cached pipettes with tip statuses to null.  */
  resetTipStatus: () => Promise<void>
  /** Removes the first element from the tip attached cache if present.
   * @param {Function} onEmptyCache After skipping the pipette, if the attached tip cache is empty, invoke this callback.
   * */
  setTipStatusResolved: (onEmptyCache?: () => void) => Promise<PipetteWithTip[]>
  /** Relevant pipette information for those pipettes with tips attached. */
  pipettesWithTip: PipetteWithTip[]
}

// Returns various utilities for interacting with the cache of pipettes with tips attached.
export function useTipAttachmentStatus(
  params: GetPipettesWithTipAttached
): TipAttachmentStatusResult {
  const [pipettesWithTip, setPipettesWithTip] = React.useState<
    PipetteWithTip[]
  >([])

  const areTipsAttached =
    pipettesWithTip.length != null && head(pipettesWithTip)?.specs != null

  const determineTipStatus = React.useCallback((): Promise<void> => {
    return getPipettesWithTipAttached(params).then(pipettesWithTip => {
      const pipettesWithTipsData = pipettesWithTip.map(pipette => {
        const specs = getPipetteModelSpecs(pipette.instrumentModel)
        return {
          specs,
          mount: pipette.mount,
        }
      })
      const pipettesWithTipAndSpecs = pipettesWithTipsData.filter(
        pipette => pipette.specs != null
      ) as PipetteWithTip[]

      setPipettesWithTip(pipettesWithTipAndSpecs)
    })
  }, [params])

  const resetTipStatus = (): Promise<void> => {
    setPipettesWithTip([])
    return Promise.resolve()
  }

  const setTipStatusResolved = (
    onEmptyCache?: () => void
  ): Promise<PipetteWithTip[]> => {
    return new Promise<PipetteWithTip[]>(resolve => {
      setPipettesWithTip(prevPipettesWithTip => {
        const newState = [...prevPipettesWithTip.slice(1)]
        if (newState.length === 0) {
          onEmptyCache?.()
        }

        resolve(newState)
        return newState
      })
    })
  }

  return {
    areTipsAttached,
    determineTipStatus,
    resetTipStatus,
    pipettesWithTip,
    setTipStatusResolved,
  }
}

// Provides the user toggle for rendering Drop Tip Wizard Flows.
//
// NOTE: Rendering these flows is independent of whether tips are actually attached. First use useTipAttachmentStatus
// to get tip attachment status.
export function useDropTipWizardFlows(): {
  showDTWiz: boolean
  toggleDTWiz: () => void
} {
  const [showDTWiz, setShowDTWiz] = React.useState(false)

  const toggleDTWiz = (): void => {
    setShowDTWiz(!showDTWiz)
  }

  return { showDTWiz, toggleDTWiz }
}

export interface DropTipWizardFlowsProps {
  robotType: RobotType
  mount: PipetteData['mount']
  instrumentModelSpecs: PipetteModelSpecs
  closeFlow: () => void
  issuedCommandsType?: 'setup' | 'fixit'
}

export function DropTipWizardFlows(
  props: DropTipWizardFlowsProps
): JSX.Element {
  // TOME: Use this component to also determine utils used.
  const issuedCommandsType = props.issuedCommandsType ?? 'setup'
  const {} = useDropTipCommands(issuedCommandsType)

  // TOME: You'll eventually want a get first step function here that takes the override first step or otherwise defaults to before_beginning firs step.
  // TOME: The exitScreen should be its own route as well? How would this work with ER? Think that through!
  const dropTipRoutingUtils = useDropTipRouting()

  return <DropTipWizard {...props} dropTipRoutingUtils={dropTipRoutingUtils} />
}
