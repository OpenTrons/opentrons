import type {
  LabwareLocationSequence,
  LoadedLabware,
  LoadedModule,
} from '@opentrons/shared-data'
import type {
  LabwareOffsetLocationSequence,
  OnAddressableAreaOffsetLocationSequenceComponent,
} from '@opentrons/api-client'

// Returns the offset location sequence, which is used to get/store offsets from the server,
// and drive LPC UI.
export function getLwOffsetLocSeqFromLocSeq(
  locSequence: LabwareLocationSequence,
  lw: LoadedLabware[],
  modules: LoadedModule[]
): LabwareOffsetLocationSequence {
  // The addressable area name is always the last item of an offset loc seq, but
  // can appear above a module in a loc seq, so we always append the addressable
  // area component last.
  // This assumes there is always only one addressable area component!
  const { mainItems, addressableAreaComponent } = locSequence.reduce<{
    mainItems: LabwareOffsetLocationSequence
    addressableAreaComponent: OnAddressableAreaOffsetLocationSequenceComponent | null
  }>(
    (acc, locSeqComponent) => {
      const { kind } = locSeqComponent

      switch (kind) {
        case 'onModule': {
          const { moduleId } = locSeqComponent
          const matchingMod = modules.find(mod => mod.id === moduleId)

          return matchingMod != null
            ? {
                ...acc,
                mainItems: [
                  ...acc.mainItems,
                  { kind, moduleModel: matchingMod.model },
                ],
              }
            : acc
        }
        case 'onAddressableArea': {
          return {
            ...acc,
            addressableAreaComponent: {
              kind,
              addressableAreaName: locSeqComponent.addressableAreaName,
            },
          }
        }
        case 'onLabware': {
          const { labwareId } = locSeqComponent
          const matchingLw = lw.find(aLw => aLw.id === labwareId)

          return matchingLw != null
            ? {
                ...acc,
                mainItems: [
                  ...acc.mainItems,
                  { kind, labwareUri: matchingLw.definitionUri },
                ],
              }
            : acc
        }
        default:
          return acc
      }
    },
    { mainItems: [], addressableAreaComponent: null }
  )

  return addressableAreaComponent != null
    ? [...mainItems, addressableAreaComponent]
    : mainItems
}
