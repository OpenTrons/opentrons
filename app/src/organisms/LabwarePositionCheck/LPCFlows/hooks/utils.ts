import { getPipetteNameSpecs } from '@opentrons/shared-data'

import type { LoadedPipette } from '@opentrons/shared-data'

// Return the pipetteId for the pipette in the protocol with the highest channel count.
export function getActivePipetteId(pipettes: LoadedPipette[]): string | null {
  if (pipettes.length < 1) {
    console.warn(
      'no pipettes in protocol, cannot determine primary pipette for LPC'
    )
    return null
  } else {
    return pipettes.reduce((acc, pip) => {
      return (getPipetteNameSpecs(acc.pipetteName)?.channels ?? 0) >
        (getPipetteNameSpecs(pip.pipetteName)?.channels ?? 0)
        ? pip
        : acc
    }, pipettes[0]).id
  }
}
