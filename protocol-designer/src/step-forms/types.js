// @flow
import type { DeckSlot, Mount } from '@opentrons/components'
import type {
  LabwareDefinition2,
  PipetteNameSpecs,
} from '@opentrons/shared-data'

export type InitialDeckSetup = {
  labware: {
    [labwareId: string]: {
      type: string,
      slot: DeckSlot,
    },
  },
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

export type FormPipette = { pipetteName: ?string, tiprackModel: ?string }
export type FormPipettesByMount = {
  left: FormPipette,
  right: FormPipette,
}

// "entities" have only properties that are time-invariant
// when they are "hydrated" aka denormalized, definitions are baked in instead of being keyed by id
// TODO IMMEDIATELY: call "hydrated" just entity. NormalizedPipetteEntity/NormalizedLabwareEntity is what redux store should use, all selectors should use the "full" (unqualified) ones
// =========== PIPETTES ========

export type NormalizedPipetteById = {
  [pipetteId: string]: {|
    name: string,
    id: string,
    tiprackModel: string, // TODO: Ian 2019-04-12 change to `tiprackOtId`
  |},
}
export type NormalizedPipette = $Values<NormalizedPipetteById>

export type PipetteEntity = {|
  name: string,
  id: string,
  tiprackModel: string, // TODO: Ian 2019-04-12 change to `tiprackOtId`
  // TODO: Ian 2019-04-12 add `tiprackLabwareDef`
  spec: PipetteNameSpecs,
|}

export type PipetteEntities = {
  [pipetteId: string]: PipetteEntity,
}

// =========== LABWARE ========

export type LabwareEntities = {
  [labwareId: string]: {|
    type: string, // TODO: Ian 2019-04-12 change to `definitionOtId`
  |},
}

export type LabwareEntity = $Values<LabwareEntities>

export type HydratedLabwareEntity = {|
  id: string,
  type: string, // TODO: Ian 2019-04-12 change to `definitionOtId`
  def: LabwareDefinition2,
|}
export type HydratedLabwareEntities = {
  [labwareId: string]: HydratedLabwareEntity,
}
