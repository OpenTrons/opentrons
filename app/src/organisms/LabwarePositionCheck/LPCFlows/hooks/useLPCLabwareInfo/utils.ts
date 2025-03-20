import type {
  LabwareLocationSequence,
  LoadedLabware,
  LoadedModule,
} from '@opentrons/shared-data'
import type { LabwareOffsetLocationSequence } from '@opentrons/api-client'

// Returns the offset location sequence, which is used to get/store offsets from the server,
// and drive LPC UI.
export function getLwOffsetLocSeqFrom(
  locSequence: LabwareLocationSequence,
  lw: LoadedLabware[],
  modules: LoadedModule[]
): LabwareOffsetLocationSequence {
  return locSequence.reduce<LabwareOffsetLocationSequence>(
    (acc, locSeqComponent) => {
      const { kind } = locSeqComponent

      switch (kind) {
        case 'onModule': {
          const { moduleId } = locSeqComponent
          const matchingMod = modules.find(mod => mod.id === moduleId)

          return matchingMod != null
            ? [...acc, { kind, moduleModel: matchingMod.model }]
            : acc
        }
        case 'onAddressableArea': {
          return [
            ...acc,
            {
              kind,
              addressableAreaName: locSeqComponent.addressableAreaName,
            },
          ]
        }
        case 'onLabware': {
          const { labwareId } = locSeqComponent
          const matchingLw = lw.find(aLw => aLw.id === labwareId)

          return matchingLw != null
            ? [...acc, { kind, labwareUri: matchingLw.definitionUri }]
            : acc
        }
        default:
          return acc
      }
    },
    []
  )
}
