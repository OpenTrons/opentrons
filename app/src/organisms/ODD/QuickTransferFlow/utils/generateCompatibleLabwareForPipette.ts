import { makeWellSetHelpers, getLabwareDefURI } from '@opentrons/shared-data'
import { getAllDefinitions as getAllLatestDefValues } from '/app/local-resources/labware'

import type { PipetteV2Specs, WellSetHelpers } from '@opentrons/shared-data'

export function generateCompatibleLabwareForPipette(
  pipetteSpecs: PipetteV2Specs
): string[] {
  const allLabwareDefinitions = getAllLatestDefValues()
  const wellSetHelpers: WellSetHelpers = makeWellSetHelpers()
  const { canPipetteUseLabware } = wellSetHelpers

  const compatibleDefUriList = allLabwareDefinitions.reduce<string[]>(
    (acc, definition) => {
      if (
        definition.allowedRoles != null &&
        (definition.allowedRoles.includes('adapter') ||
          definition.allowedRoles.includes('lid') ||
          definition.allowedRoles.includes('system'))
      ) {
        return acc
      } else if (pipetteSpecs.channels === 1) {
        return [...acc, getLabwareDefURI(definition)]
      } else {
        const isCompatible = canPipetteUseLabware(pipetteSpecs, definition)
        return isCompatible ? [...acc, getLabwareDefURI(definition)] : acc
      }
    },
    []
  )

  // console.log(JSON.stringify(compatibleDefUriList))
  // to update this list, uncomment the above log statement and
  // paste the result into the const in ./constants.ts
  return compatibleDefUriList
}
