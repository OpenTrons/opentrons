// @flow
import type {DeckSlot, Mount} from '@opentrons/components'
import type {PipetteNameSpecs} from '@opentrons/shared-data'

export type InitialDeckSetup = {
  labware: {[labwareId: string]: {
    type: string,
    slot: DeckSlot,
  }},
  pipettes: {
    [pipetteId: string]: {
      name: string,
      mount: Mount,
      tiprackModel: string,
    },
  },
}

export type LabwareOnDeck = $Values<$PropertyType<InitialDeckSetup, 'labware'>>
export type PipetteOnDeck = $Values<$PropertyType<InitialDeckSetup, 'pipettes'>>

type EditPipetteFields = {pipetteModel: string, tiprackModel: string}
export type EditPipetteFieldsByMount = {
  left: ?EditPipetteFields,
  right: ?EditPipetteFields,
}

// "entities" have only properties that are time-invariant

export type PipetteEntities = {
  [pipetteId: string]: {|
    name: string,
    tiprackModel: string,
    spec: PipetteNameSpecs,
  |},
}
export type PipetteEntity = $Values<PipetteEntities>

export type LabwareEntities = {
  [labwareId: string]: {|
    type: string,
  |},
}
