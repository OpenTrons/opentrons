import filter from 'lodash/filter'
import isEmpty from 'lodash/isEmpty'
import last from 'lodash/last'
import mapValues from 'lodash/mapValues'

import { actions as stepFormActions } from '../../../step-forms'
import { actions as steplistActions } from '../../../steplist'
import { uuid } from '../../../utils'
import {
  createContainer,
  deleteContainer,
} from '../../../labware-ingred/actions'
import { INITIAL_DECK_SETUP_STEP_ID } from '../../../constants'

import type { PipetteMount, PipetteName } from '@opentrons/shared-data'
import type { NormalizedPipette } from '@opentrons/step-generation'
import type { ThunkDispatch } from '../../../types'
import type { LabwareOnDeck, PipetteOnDeck } from '../../../step-forms'
import type { StepIdType } from '../../../form-types'

const adapter96ChannelDefUri = 'opentrons/opentrons_flex_96_tiprack_adapter/1'

type PipetteFieldsData = Omit<
  PipetteOnDeck,
  'id' | 'spec' | 'tiprackLabwareDef' | 'pythonName'
>

export const editPipettes = (
  labware: { [labwareId: string]: LabwareOnDeck },
  pipettes: { [pipetteId: string]: PipetteOnDeck },
  orderedStepIds: StepIdType[],
  dispatch: ThunkDispatch<any>,
  mount: PipetteMount,
  selectedPip: PipetteName,
  selectedTips: string[],
  leftPip?: PipetteOnDeck,
  rightPip?: PipetteOnDeck
): void => {
  const oppositePipette = mount === 'left' ? rightPip : leftPip
  const otherPipFields: PipetteFieldsData | null =
    oppositePipette != null
      ? {
          mount: oppositePipette.mount,
          name: oppositePipette.name,
          tiprackDefURI: oppositePipette.tiprackDefURI,
        }
      : null
  const newPip: PipetteFieldsData = {
    mount: mount,
    name: selectedPip,
    tiprackDefURI: selectedTips,
  }

  const newPipetteArray: PipetteFieldsData[] =
    otherPipFields != null ? [otherPipFields, newPip] : [newPip]

  const prevPipetteIds = Object.keys(pipettes)
  const usedPrevPipettes: string[] = []
  const nextPipettes: {
    [pipetteId: string]: {
      mount: string
      name: PipetteName
      tiprackDefURI: string[]
      id: string
    }
  } = {}

  newPipetteArray.forEach((newPipette: PipetteFieldsData) => {
    const candidatePipetteIds = prevPipetteIds.filter(id => {
      const prevPipette = pipettes[id]
      const alreadyUsed = usedPrevPipettes.some(usedId => usedId === id)
      return !alreadyUsed && prevPipette.name === newPipette.name
    })
    const pipetteId: string | null | undefined = candidatePipetteIds[0]
    if (pipetteId) {
      // update used pipette list
      usedPrevPipettes.push(pipetteId)
      nextPipettes[pipetteId] = { ...newPipette, id: pipetteId }
    } else {
      const newId = uuid()
      nextPipettes[newId] = { ...newPipette, id: newId }
    }
  })

  const newTiprackUris = new Set(
    newPipetteArray.flatMap(pipette => pipette.tiprackDefURI)
  )
  const previousTiprackLabwares = Object.values(labware).filter(
    lw => lw.def.parameters.isTiprack
  )

  const previousTiprackUris = new Set(
    previousTiprackLabwares.map(labware => labware.labwareDefURI)
  )

  // Find tipracks to delete (old tipracks not in new pipettes)
  previousTiprackLabwares
    .filter(labware => !newTiprackUris.has(labware.labwareDefURI))
    .forEach(labware => dispatch(deleteContainer({ labwareId: labware.id })))

  // Create new tipracks that are not in previous tiprackURIs
  newTiprackUris.forEach(tiprackDefUri => {
    if (!previousTiprackUris.has(tiprackDefUri)) {
      const adapterUnderLabwareDefURI = newPipetteArray.some(
        pipette => pipette.name === 'p1000_96'
      )
        ? adapter96ChannelDefUri
        : undefined
      dispatch(
        createContainer({
          labwareDefURI: tiprackDefUri,
          adapterUnderLabwareDefURI,
        })
      )
    }
  })
  dispatch(
    stepFormActions.createPipettes(
      mapValues(
        nextPipettes,
        ({
          id,
          name,
          tiprackDefURI,
        }: typeof nextPipettes[keyof typeof nextPipettes]): NormalizedPipette => ({
          id,
          name,
          tiprackDefURI,
        })
      )
    )
  )

  // set/update pipette locations in initial deck setup step
  dispatch(
    steplistActions.changeSavedStepForm({
      stepId: INITIAL_DECK_SETUP_STEP_ID,
      update: {
        pipetteLocationUpdate: mapValues(
          nextPipettes,
          (p: PipetteOnDeck) => p.mount
        ),
      },
    })
  )

  const pipetteIdsToDelete: string[] = Object.keys(pipettes).filter(
    id => !(id in nextPipettes)
  )

  // SubstitutionMap represents a map of oldPipetteId => newPipetteId
  // When a pipette's tiprack changes, the ids will be the same
  interface SubstitutionMap {
    [pipetteId: string]: string
  }

  const pipetteReplacementMap: SubstitutionMap = pipetteIdsToDelete.reduce(
    (acc: SubstitutionMap, deletedId: string): SubstitutionMap => {
      const deletedPipette = pipettes[deletedId]
      const replacementId = Object.keys(nextPipettes).find(
        newId => nextPipettes[newId].mount === deletedPipette.mount
      )
      // @ts-expect-error(sa, 2021-6-21): redlacementId will always be a string, so right side of the and will always be true
      return replacementId && replacementId !== -1
        ? { ...acc, [deletedId]: replacementId }
        : acc
    },
    {}
  )

  const pipettesWithNewTipracks: string[] = filter(
    nextPipettes,
    (nextPipette: typeof nextPipettes[keyof typeof nextPipettes]) => {
      const newPipetteId = nextPipette.id
      const nextTips = nextPipette.tiprackDefURI
      const oldTips =
        newPipetteId in pipettes ? pipettes[newPipetteId].tiprackDefURI : null
      const tiprackChanged =
        oldTips != null &&
        nextTips.every((item, index) => item !== oldTips[index])
      return tiprackChanged
    }
  ).map(pipette => pipette.id)

  // this creates an identity map with all pipette ids that have new tipracks
  // this will be used so that handleFormChange gets called even though the
  // pipette id itself has not changed (only it's tiprack)

  const pipettesWithNewTiprackIdentityMap: SubstitutionMap = pipettesWithNewTipracks.reduce(
    (acc: SubstitutionMap, id: string): SubstitutionMap => {
      return {
        ...acc,
        ...{ [id]: id },
      }
    },
    {}
  )

  const substitutionMap = {
    ...pipetteReplacementMap,
    ...pipettesWithNewTiprackIdentityMap,
  }

  // substitute deleted pipettes with new pipettes on the same mount, if any
  if (!isEmpty(substitutionMap) && orderedStepIds.length > 0) {
    // NOTE: using start/end here is meant to future-proof this action for multi-step editing
    dispatch(
      stepFormActions.substituteStepFormPipettes({
        substitutionMap,
        startStepId: orderedStepIds[0],
        endStepId: last(orderedStepIds) ?? '',
      })
    )
  }

  // delete any pipettes no longer in use
  if (pipetteIdsToDelete.length > 0) {
    dispatch(stepFormActions.deletePipettes(pipetteIdsToDelete))
  }
}
