// @flow
import assert from 'assert'
import Ajv from 'ajv'
import isEqual from 'lodash/isEqual'
import values from 'lodash/values'
import labwareSchema from '@opentrons/shared-data/labware/schemas/2.json'
import { getLabwareDefURI } from '@opentrons/shared-data'
import * as labwareDefSelectors from './selectors'
import type { LabwareDefinition2 } from '@opentrons/shared-data'
import type { GetState, ThunkAction, ThunkDispatch } from '../types'
import type { LabwareUploadMessage } from './types'

export type LabwareUploadMessageAction = {|
  type: 'LABWARE_UPLOAD_MESSAGE',
  payload: LabwareUploadMessage,
|}

export const labwareUploadMessage = (
  payload: LabwareUploadMessage
): LabwareUploadMessageAction => ({
  type: 'LABWARE_UPLOAD_MESSAGE',
  payload,
})

export type CreateCustomLabwareDef = {|
  type: 'CREATE_CUSTOM_LABWARE_DEF',
  payload: {|
    def: LabwareDefinition2,
  |},
|}

const createCustomLabwareDefAction = (
  payload: $PropertyType<CreateCustomLabwareDef, 'payload'>
): CreateCustomLabwareDef => ({
  type: 'CREATE_CUSTOM_LABWARE_DEF',
  payload,
})

export type ReplaceCustomLabwareDefs = {|
  type: 'REPLACE_CUSTOM_LABWARE_DEFS',
  payload: {|
    defURIsToOverwrite: Array<string>,
    newDef: LabwareDefinition2,
  |},
|}

const replaceCustomLabwareDefs = (
  payload: $PropertyType<ReplaceCustomLabwareDefs, 'payload'>
): ReplaceCustomLabwareDefs => ({
  type: 'REPLACE_CUSTOM_LABWARE_DEFS',
  payload,
})

const ajv = new Ajv({ allErrors: true, jsonPointers: true })
const validate = ajv.compile(labwareSchema)

const _labwareDefsMatchingLoadName = (
  labwareDefs: Array<LabwareDefinition2>,
  loadName: string
) => labwareDefs.filter(def => def.parameters.loadName === loadName)

const _labwareDefsMatchingDisplayName = (
  labwareDefs: Array<LabwareDefinition2>,
  displayName: string
) =>
  labwareDefs.filter(
    def =>
      def.metadata.displayName.trim().toLowerCase() ===
      displayName.trim().toLowerCase()
  )

export const createCustomLabwareDef = (
  event: SyntheticInputEvent<HTMLInputElement>
): ThunkAction<*> => (dispatch: ThunkDispatch<*>, getState: GetState) => {
  const allLabwareDefs: Array<LabwareDefinition2> = values(
    labwareDefSelectors.getLabwareDefsByURI(getState())
  )
  const customLabwareDefs: Array<LabwareDefinition2> = values(
    labwareDefSelectors.getCustomLabwareDefsByURI(getState())
  )

  const file = event.currentTarget.files[0]
  const reader = new FileReader()

  // reset the state of the input to allow file re-uploads
  event.currentTarget.value = ''

  if (!file.name.match(/\.json$/i)) {
    return dispatch(
      labwareUploadMessage({
        messageType: 'NOT_JSON',
      })
    )
  }

  reader.onload = readEvent => {
    const result = readEvent.currentTarget.result
    let parsedLabwareDef: ?LabwareDefinition2

    try {
      parsedLabwareDef = JSON.parse(result)
    } catch (error) {
      console.error(error)

      return dispatch(
        labwareUploadMessage({
          messageType: 'INVALID_JSON_FILE',
          errorText: error.message,
        })
      )
    }

    const valid: boolean =
      parsedLabwareDef === null ? false : validate(parsedLabwareDef)
    const loadName = parsedLabwareDef?.parameters?.loadName || ''
    const displayName = parsedLabwareDef?.metadata?.displayName || ''

    if (!valid) {
      console.debug('validation errors:', validate.errors)
      return dispatch(
        labwareUploadMessage({
          messageType: 'INVALID_JSON_FILE',
        })
      )
    } else if (allLabwareDefs.some(def => isEqual(def, parsedLabwareDef))) {
      return dispatch(
        labwareUploadMessage({
          messageType: 'EXACT_LABWARE_MATCH',
        })
      )
    }

    const defsMatchingCustomLoadName = _labwareDefsMatchingLoadName(
      customLabwareDefs,
      loadName
    )
    const defsMatchingCustomDisplayName = _labwareDefsMatchingDisplayName(
      customLabwareDefs,
      displayName
    )
    if (
      defsMatchingCustomLoadName.length > 0 ||
      defsMatchingCustomDisplayName.length > 0
    ) {
      return dispatch(
        labwareUploadMessage({
          messageType: 'ASK_FOR_LABWARE_OVERWRITE',
          defsMatchingLoadName: defsMatchingCustomLoadName,
          defsMatchingDisplayName: defsMatchingCustomDisplayName,
          pendingDef: parsedLabwareDef,
        })
      )
    }

    const allDefsMatchingLoadName = _labwareDefsMatchingLoadName(
      allLabwareDefs,
      loadName
    )
    const allDefsMatchingDisplayName = _labwareDefsMatchingDisplayName(
      allLabwareDefs,
      displayName
    )
    if (
      allDefsMatchingLoadName.length > 0 ||
      allDefsMatchingDisplayName.length > 0
    ) {
      return dispatch(
        labwareUploadMessage({
          messageType: 'LABWARE_NAME_CONFLICT',
          defsMatchingLoadName: allDefsMatchingLoadName,
          defsMatchingDisplayName: allDefsMatchingDisplayName,
          // message: // TODO IMMEDIATELY
          //   'The load name and/or display name matches that of another STANDARD labware',
        })
      )
    }

    return dispatch(
      createCustomLabwareDefAction({
        def: parsedLabwareDef,
      })
    )
  }
  reader.readAsText(file)
}

export const overwriteLabware = (): ThunkAction<*> => (
  dispatch: ThunkDispatch<*>,
  getState: GetState
) => {
  // get def used to overwrite existing def from the labware upload message
  const newDef = labwareDefSelectors.getLabwareUploadMessage(getState())
    ?.pendingDef

  if (newDef) {
    // TODO IMMEDIATELY can this happen upstream? Duplicate code!!!
    const loadName = newDef?.parameters?.loadName || ''
    const displayName = newDef?.metadata?.displayName || ''
    const customLabwareDefs: Array<LabwareDefinition2> = values(
      labwareDefSelectors.getCustomLabwareDefsByURI(getState())
    )
    const defURIsToOverwrite = customLabwareDefs
      .filter(
        d =>
          !isEqual(d, newDef) && // don't delete the def we just added!
          (_labwareDefsMatchingLoadName([d], loadName).length > 0 ||
            _labwareDefsMatchingDisplayName([d], displayName).length > 0)
      )
      .map(getLabwareDefURI)
    if (defURIsToOverwrite.length > 0) {
      dispatch(replaceCustomLabwareDefs({ defURIsToOverwrite, newDef }))
    }
  } else {
    assert(
      false,
      'overwriteLabware thunk expected pendingDef in labwareUploadMessage'
    )
  }
}

type DismissLabwareUploadMessage = {|
  type: 'DISMISS_LABWARE_UPLOAD_MESSAGE',
|}

export const dismissLabwareUploadMessage = (): DismissLabwareUploadMessage => ({
  type: 'DISMISS_LABWARE_UPLOAD_MESSAGE',
})
