import { handleActions } from 'redux-actions'
import mapValues from 'lodash/mapValues'
import cloneDeep from 'lodash/cloneDeep'
import merge from 'lodash/merge'
import omit from 'lodash/omit'
import reduce from 'lodash/reduce'
import {
  getLabwareDefaultEngageHeight,
  getLabwareDefURI,
  getModuleType,
  MAGNETIC_MODULE_TYPE,
  MAGNETIC_MODULE_V1,
  THERMOCYCLER_MODULE_TYPE,
} from '@opentrons/shared-data'
import { GRIPPER_LOCATION } from '@opentrons/step-generation'
import { rootReducer as labwareDefsRootReducer } from '../../labware-defs'
import { INITIAL_DECK_SETUP_STEP_ID } from '../../constants'
import { getPDMetadata } from '../../file-types'
import {
  getDefaultsForStepType,
  handleFormChange,
} from '../../steplist/formLevel'
import { PRESAVED_STEP_ID } from '../../steplist/types'
import { getLabwareIsCompatible } from '../../utils/labwareModuleCompatibility'
import { getLabwareOnModule } from '../../ui/modules/utils'
import {
  getAdditionalEquipmentPythonName,
  getLabwarePythonName,
  getModulePythonName,
} from '../../utils'
import { nestedCombineReducers } from './nestedCombineReducers'
import {
  _getPipetteEntitiesRootState,
  _getLabwareEntitiesRootState,
  _getInitialDeckSetupRootState,
  _getAdditionalEquipmentEntitiesRootState,
} from '../selectors'
import {
  createPresavedStepForm,
  getDeckItemIdInSlot,
  getIdsInRange,
} from '../utils'

import type { Reducer } from 'redux'
import type { Action as ReduxActionsAction } from 'redux-actions'
import type {
  NormalizedAdditionalEquipmentById,
  NormalizedPipetteById,
} from '@opentrons/step-generation'
import type { PipetteName } from '@opentrons/shared-data'
import type { RootState as LabwareDefsRootState } from '../../labware-defs'
import type { LoadFileAction } from '../../load-file'
import type { SaveStepFormAction } from '../../ui/steps/actions/thunks'
import type { ReplaceCustomLabwareDef } from '../../labware-defs/actions'
import type {
  CreateDeckFixtureAction,
  DeleteDeckFixtureAction,
  ToggleIsGripperRequiredAction,
} from '../actions/additionalItems'
import type {
  CreateModuleAction,
  CreatePipettesAction,
  DeleteModuleAction,
  DeletePipettesAction,
  EditModuleAction,
  SubstituteStepFormPipettesAction,
  ChangeBatchEditFieldAction,
  ResetBatchEditFieldChangesAction,
  SaveStepFormsMultiAction,
} from '../actions'

import type {
  CancelStepFormAction,
  ChangeFormInputAction,
  ChangeSavedStepFormAction,
  DeleteStepAction,
  DeleteMultipleStepsAction,
  PopulateFormAction,
  ReorderStepsAction,
  FormPatch,
} from '../../steplist/actions'
import type { FormData, StepIdType, StepType } from '../../form-types'
import type {
  CreateContainerAction,
  DeleteContainerAction,
  DuplicateLabwareAction,
  EditMultipleLabwareAction,
  RenameStepAction,
  SwapSlotContentsAction,
} from '../../labware-ingred/actions'
import type {
  AddStepAction,
  DuplicateStepAction,
  DuplicateMultipleStepsAction,
  ReorderSelectedStepAction,
  SelectStepAction,
  SelectTerminalItemAction,
  SelectMultipleStepsAction,
} from '../../ui/steps/actions/types'
import type { Action } from '../../types'
import type { PipetteLoadInfo } from '../../file-types'
import type {
  AdditionalEquipmentLocationUpdate,
  LocationUpdate,
} from '../../load-file/migration/utils/getAdditionalEquipmentLocationUpdate'
import type {
  NormalizedLabware,
  NormalizedLabwareById,
  ModuleEntities,
} from '../types'
import type { EditMultipleModulesAction } from '../../modules'

type FormState = FormData | null
const unsavedFormInitialState = null
// the `unsavedForm` state holds temporary form info that is saved or thrown away with "cancel".
export type UnsavedFormActions =
  | AddStepAction
  | ChangeFormInputAction
  | PopulateFormAction
  | CancelStepFormAction
  | SaveStepFormAction
  | DeleteStepAction
  | DeleteMultipleStepsAction
  | CreateModuleAction
  | DeleteModuleAction
  | SelectTerminalItemAction
  | EditModuleAction
  | SubstituteStepFormPipettesAction
  | SelectMultipleStepsAction
  | ToggleIsGripperRequiredAction
  | CreateDeckFixtureAction
  | DeleteDeckFixtureAction
  | RenameStepAction
export const unsavedForm = (
  rootState: RootState,
  action: UnsavedFormActions
): FormState => {
  const unsavedFormState = rootState
    ? rootState.unsavedForm
    : unsavedFormInitialState

  switch (action.type) {
    case 'ADD_STEP': {
      return createPresavedStepForm({
        stepType: action.payload.stepType,
        stepId: action.payload.id,
        pipetteEntities: _getPipetteEntitiesRootState(rootState),
        labwareEntities: _getLabwareEntitiesRootState(rootState),
        savedStepForms: rootState.savedStepForms,
        orderedStepIds: rootState.orderedStepIds,
        initialDeckSetup: _getInitialDeckSetupRootState(rootState),
        robotStateTimeline: action.meta.robotStateTimeline,
        additionalEquipmentEntities: _getAdditionalEquipmentEntitiesRootState(
          rootState
        ),
      })
    }

    case 'CHANGE_FORM_INPUT': {
      const fieldUpdate = handleFormChange(
        action.payload.update,
        unsavedFormState,
        _getPipetteEntitiesRootState(rootState),
        _getLabwareEntitiesRootState(rootState)
      )
      // @ts-expect-error (IL, 2020-02-24): address in #3161, underspecified form fields may be overwritten in type-unsafe manner
      return { ...unsavedFormState, ...fieldUpdate }
    }

    case 'CHANGE_STEP_DETAILS': {
      const fieldUpdate = handleFormChange(
        action.payload.update,
        unsavedFormState,
        _getPipetteEntitiesRootState(rootState),
        _getLabwareEntitiesRootState(rootState)
      )
      // @ts-expect-error (IL, 2020-02-24): address in #3161, underspecified form fields may be overwritten in type-unsafe manner
      return { ...unsavedFormState, ...fieldUpdate }
    }

    case 'POPULATE_FORM':
      return action.payload

    case 'CANCEL_STEP_FORM':
    case 'CREATE_MODULE':
    case 'DELETE_MODULE':
    case 'TOGGLE_IS_GRIPPER_REQUIRED':
    case 'CREATE_DECK_FIXTURE':
    case 'DELETE_DECK_FIXTURE':
    case 'DELETE_STEP':
    case 'DELETE_MULTIPLE_STEPS':
    case 'SELECT_MULTIPLE_STEPS':
    case 'EDIT_MODULE':
    case 'SAVE_STEP_FORM':
    case 'SELECT_TERMINAL_ITEM':
      return unsavedFormInitialState

    case 'SUBSTITUTE_STEP_FORM_PIPETTES': {
      // only substitute unsaved step form if its ID is in the start-end range
      const { substitutionMap, startStepId, endStepId } = action.payload
      const stepIdsToUpdate = getIdsInRange(
        rootState.orderedStepIds,
        startStepId,
        endStepId
      )

      if (
        unsavedFormState &&
        unsavedFormState?.pipette && // TODO(IL, 2020-06-02): Flow should know unsavedFormState is not null here (so keys are safe to access), but it's being dumb
        unsavedFormState.pipette in substitutionMap &&
        unsavedFormState.id &&
        stepIdsToUpdate.includes(unsavedFormState.id)
      ) {
        // TODO(IL, 2020-02-24): address in #3161, underspecified form fields may be overwritten in type-unsafe manner
        return {
          ...unsavedFormState,
          ...handleFormChange(
            {
              pipette: substitutionMap[unsavedFormState.pipette],
            },
            unsavedFormState,
            _getPipetteEntitiesRootState(rootState),
            _getLabwareEntitiesRootState(rootState)
          ),
        }
      }

      return unsavedFormState
    }

    default:
      return unsavedFormState
  }
}
export type SavedStepFormState = Record<StepIdType, FormData>
export const initialDeckSetupStepForm: FormData = {
  stepType: 'manualIntervention',
  id: INITIAL_DECK_SETUP_STEP_ID,
  labwareLocationUpdate: {},
  pipetteLocationUpdate: {},
  moduleLocationUpdate: {},
  trashBinLocationUpdate: {},
  wasteChuteLocationUpdate: {},
  stagingAreaLocationUpdate: {},
  gripperLocationUpdate: {},
}
export const initialSavedStepFormsState: SavedStepFormState = {
  [INITIAL_DECK_SETUP_STEP_ID]: initialDeckSetupStepForm,
}
export type SavedStepFormsActions =
  | SaveStepFormAction
  | SaveStepFormsMultiAction
  | DeleteStepAction
  | DeleteMultipleStepsAction
  | LoadFileAction
  | CreateContainerAction
  | DeleteContainerAction
  | SubstituteStepFormPipettesAction
  | DeletePipettesAction
  | CreateModuleAction
  | DeleteModuleAction
  | DuplicateStepAction
  | DuplicateMultipleStepsAction
  | ChangeSavedStepFormAction
  | DuplicateLabwareAction
  | SwapSlotContentsAction
  | ReplaceCustomLabwareDef
  | EditModuleAction
  | ToggleIsGripperRequiredAction
  | CreateDeckFixtureAction
  | DeleteDeckFixtureAction
export const _editModuleFormUpdate = ({
  savedForm,
  moduleId,
  formId,
  rootState,
  nextModuleModel,
}: {
  savedForm: FormData
  moduleId: string
  formId: string
  rootState: RootState
  nextModuleModel: string
}): FormData => {
  if (
    savedForm.stepType === 'magnet' &&
    savedForm.moduleId === moduleId &&
    savedForm.magnetAction === 'engage'
  ) {
    const prevEngageHeight = parseFloat(savedForm.engageHeight as string)

    if (Number.isFinite(prevEngageHeight)) {
      const initialDeckSetup = _getInitialDeckSetupRootState(rootState)

      const labwareEntity = getLabwareOnModule(initialDeckSetup, moduleId)
      const labwareDefaultEngageHeight = labwareEntity
        ? getLabwareDefaultEngageHeight(labwareEntity.def)
        : null
      const moduleEntity = initialDeckSetup.modules[moduleId]
      console.assert(
        moduleEntity,
        `editModuleFormUpdate expected moduleEntity for module ${moduleId}`
      )
      const prevModuleModel = moduleEntity?.model

      if (labwareDefaultEngageHeight != null) {
        // compensate for fact that V1 mag module uses 'short mm'
        const shortMMDefault = labwareDefaultEngageHeight * 2
        const prevModelSpecificDefault =
          prevModuleModel === MAGNETIC_MODULE_V1
            ? shortMMDefault
            : labwareDefaultEngageHeight
        const nextModelSpecificDefault =
          nextModuleModel === MAGNETIC_MODULE_V1
            ? shortMMDefault
            : labwareDefaultEngageHeight

        if (prevEngageHeight === prevModelSpecificDefault) {
          return {
            ...savedForm,
            engageHeight: String(nextModelSpecificDefault),
          }
        }
      }
    }

    // default case: null out engageHeight if magnet step's module has been edited
    const blankEngageHeight = getDefaultsForStepType('magnet').engageHeight
    return { ...savedForm, engageHeight: blankEngageHeight }
  }

  // not a Magnet > Engage step for the edited moduleId, no change
  return savedForm
}
export const savedStepForms = (
  rootState: RootState,
  action: SavedStepFormsActions
): SavedStepFormState => {
  const savedStepForms = rootState
    ? rootState.savedStepForms
    : initialSavedStepFormsState

  switch (action.type) {
    case 'SAVE_STEP_FORM': {
      return { ...savedStepForms, [action.payload.id]: action.payload }
    }

    case 'SAVE_STEP_FORMS_MULTI': {
      const { editedFields, stepIds } = action.payload
      return stepIds.reduce(
        (acc, stepId) => ({
          ...acc,
          [stepId]: { ...savedStepForms[stepId], ...editedFields },
        }),
        { ...savedStepForms }
      )
    }

    case 'DELETE_STEP': {
      return omit(savedStepForms, action.payload)
    }

    case 'DELETE_MULTIPLE_STEPS': {
      return omit(savedStepForms, action.payload)
    }

    case 'LOAD_FILE': {
      const { file } = action.payload
      const stepFormsFromFile = getPDMetadata(file).savedStepForms
      return mapValues(stepFormsFromFile, stepForm => ({
        ...getDefaultsForStepType(stepForm.stepType),
        ...stepForm,
      }))
    }
    case 'CREATE_DECK_FIXTURE': {
      const { id, location, name } = action.payload
      const prevInitialDeckSetupStep =
        savedStepForms[INITIAL_DECK_SETUP_STEP_ID]
      const locationUpdate = `${name}LocationUpdate`
      return {
        ...savedStepForms,
        [INITIAL_DECK_SETUP_STEP_ID]: {
          ...prevInitialDeckSetupStep,
          [locationUpdate]: {
            ...prevInitialDeckSetupStep[locationUpdate],
            [id]: location,
          },
        },
      }
    }
    case 'DELETE_DECK_FIXTURE': {
      const { id } = action.payload
      const name = id.split(':')[1]
      const locationUpdate = `${name}LocationUpdate`

      return mapValues(
        savedStepForms,
        (form: FormData): FormData => {
          const updatedLocation = omit(form[locationUpdate] || {}, id)

          return {
            ...form,
            [locationUpdate]:
              Object.keys(updatedLocation).length > 0 ? updatedLocation : {},
          }
        }
      )
    }
    case 'TOGGLE_IS_GRIPPER_REQUIRED': {
      const { id } = action.payload
      const prevInitialDeckSetupStep =
        savedStepForms[INITIAL_DECK_SETUP_STEP_ID]
      const gripperLocationUpdate: LocationUpdate =
        prevInitialDeckSetupStep.gripperLocationUpdate
      const gripperKey = Object.entries(gripperLocationUpdate).find(
        ([_, value]) => value === GRIPPER_LOCATION
      )?.[0]

      if (gripperKey == null) {
        return {
          ...savedStepForms,
          [INITIAL_DECK_SETUP_STEP_ID]: {
            ...prevInitialDeckSetupStep,
            gripperLocationUpdate: {
              ...gripperLocationUpdate,
              [id]: GRIPPER_LOCATION,
            },
          },
        }
      } else {
        return {
          ...savedStepForms,
          [INITIAL_DECK_SETUP_STEP_ID]: {
            ...prevInitialDeckSetupStep,
            gripperLocationUpdate: {},
          },
        }
      }
    }
    case 'DUPLICATE_LABWARE':
    case 'CREATE_CONTAINER': {
      // auto-update initial deck setup state.
      const prevInitialDeckSetupStep =
        savedStepForms[INITIAL_DECK_SETUP_STEP_ID]
      const labwareId: string =
        action.type === 'CREATE_CONTAINER'
          ? action.payload.id
          : action.payload.duplicateLabwareId
      console.assert(
        prevInitialDeckSetupStep,
        'expected initial deck setup step to exist, could not handle CREATE_CONTAINER'
      )
      const slot = action.payload.slot

      if (!slot) {
        console.warn('no slots available, ignoring action:', action)
        return savedStepForms
      }
      return {
        ...savedStepForms,
        [INITIAL_DECK_SETUP_STEP_ID]: {
          ...prevInitialDeckSetupStep,
          labwareLocationUpdate: {
            ...prevInitialDeckSetupStep.labwareLocationUpdate,
            [labwareId]: slot,
          },
        },
      }
    }

    case 'CREATE_MODULE': {
      const prevInitialDeckSetupStep =
        savedStepForms[INITIAL_DECK_SETUP_STEP_ID]
      const labwareOccupyingDestination = getDeckItemIdInSlot(
        prevInitialDeckSetupStep.labwareLocationUpdate as Record<
          string,
          string
        >,
        action.payload.slot
      )
      const moduleId = action.payload.id
      // If module is going into a slot occupied by a labware,
      // move the labware on top of the new module
      const labwareLocationUpdate =
        labwareOccupyingDestination == null
          ? prevInitialDeckSetupStep.labwareLocationUpdate
          : {
              ...prevInitialDeckSetupStep.labwareLocationUpdate,
              [labwareOccupyingDestination]: moduleId,
            }
      return mapValues(savedStepForms, (savedForm: FormData, formId) => {
        if (formId === INITIAL_DECK_SETUP_STEP_ID) {
          return {
            ...prevInitialDeckSetupStep,
            labwareLocationUpdate,
            moduleLocationUpdate: {
              ...prevInitialDeckSetupStep.moduleLocationUpdate,
              [action.payload.id]: action.payload.slot,
            },
          }
        }

        // NOTE: since users can only have 1 magnetic module at a time,
        // and since the Magnet step form doesn't allow users to select a dropdown,
        // we auto-select a newly-added magnetic module for all of them
        // to handle the case where users delete and re-add a magnetic module
        if (
          savedForm.stepType === 'magnet' &&
          action.payload.type === MAGNETIC_MODULE_TYPE
        ) {
          return { ...savedForm, moduleId }
        }

        // same logic applies to Thermocycler
        if (
          savedForm.stepType === 'thermocycler' &&
          action.payload.type === THERMOCYCLER_MODULE_TYPE
        ) {
          return { ...savedForm, moduleId }
        }

        return savedForm
      })
    }

    case 'EDIT_MODULE': {
      const moduleId = action.payload.id
      return mapValues(savedStepForms, (savedForm: FormData, formId) =>
        _editModuleFormUpdate({
          moduleId,
          savedForm,
          formId,
          rootState,
          nextModuleModel: action.payload.model,
        })
      )
    }

    case 'MOVE_DECK_ITEM': {
      const { sourceSlot, destSlot } = action.payload
      return mapValues(
        savedStepForms,
        (savedForm: FormData): FormData => {
          if (savedForm.stepType === 'manualIntervention') {
            // swap labware/module slots from all manualIntervention steps
            // (or place compatible labware in dest slot onto module)
            const sourceLabwareId = getDeckItemIdInSlot(
              savedForm.labwareLocationUpdate as Record<string, string>,
              sourceSlot
            )
            const destLabwareId = getDeckItemIdInSlot(
              savedForm.labwareLocationUpdate as Record<string, string>,
              destSlot
            )
            const sourceModuleId = getDeckItemIdInSlot(
              savedForm.moduleLocationUpdate as Record<string, string>,
              sourceSlot
            )
            const destModuleId = getDeckItemIdInSlot(
              savedForm.moduleLocationUpdate as Record<string, string>,
              destSlot
            )

            if (sourceModuleId && destLabwareId) {
              // moving module to a destination slot with labware
              const prevInitialDeckSetup = _getInitialDeckSetupRootState(
                rootState
              )

              const moduleEntity = prevInitialDeckSetup.modules[sourceModuleId]
              const labwareEntity = prevInitialDeckSetup.labware[destLabwareId]
              const isCompat = getLabwareIsCompatible(
                labwareEntity.def,
                moduleEntity.type
              )
              const moduleIsOccupied =
                getDeckItemIdInSlot(
                  savedForm.labwareLocationUpdate as Record<string, string>,
                  sourceModuleId
                ) != null

              if (isCompat && !moduleIsOccupied) {
                // only in this special case, we put module under the labware
                return {
                  ...savedForm,
                  labwareLocationUpdate: {
                    ...savedForm.labwareLocationUpdate,
                    [destLabwareId]: sourceModuleId,
                  },
                  moduleLocationUpdate: {
                    ...savedForm.moduleLocationUpdate,
                    [sourceModuleId]: destSlot,
                  },
                }
              }
            }

            const labwareLocationUpdate: Record<string, string> = {
              ...savedForm.labwareLocationUpdate,
            }

            if (sourceLabwareId != null) {
              labwareLocationUpdate[sourceLabwareId] = destSlot
            }

            if (destLabwareId != null) {
              labwareLocationUpdate[destLabwareId] = sourceSlot
            }

            const moduleLocationUpdate: Record<string, string> = {
              ...savedForm.moduleLocationUpdate,
            }

            if (sourceModuleId != null) {
              moduleLocationUpdate[sourceModuleId] = destSlot
            }

            if (destModuleId != null) {
              moduleLocationUpdate[destModuleId] = sourceSlot
            }

            return { ...savedForm, labwareLocationUpdate, moduleLocationUpdate }
          }

          return savedForm
        }
      )
    }

    case 'DELETE_CONTAINER': {
      const labwareIdToDelete = action.payload.labwareId
      return mapValues(savedStepForms, (savedForm: FormData) => {
        if (savedForm.stepType === 'manualIntervention') {
          // remove instances of labware from all manualIntervention steps
          return {
            ...savedForm,
            labwareLocationUpdate: omit(
              savedForm.labwareLocationUpdate,
              labwareIdToDelete
            ),
          }
        }

        const deleteLabwareUpdate = reduce<FormData, FormData>(
          savedForm,
          (acc, value, fieldName) => {
            if (value === labwareIdToDelete) {
              // TODO(IL, 2020-02-24): address in #3161, underspecified form fields may be overwritten in type-unsafe manner
              return {
                ...acc,
                ...handleFormChange(
                  {
                    [fieldName]: null,
                  },
                  acc,
                  _getPipetteEntitiesRootState(rootState),
                  _getLabwareEntitiesRootState(rootState)
                ),
              }
            } else {
              return acc
            }
          },
          savedForm
        )
        // TODO(IL, 2020-02-24): address in #3161, underspecified form fields may be overwritten in type-unsafe manner
        return { ...savedForm, ...deleteLabwareUpdate }
      })
    }

    case 'DELETE_PIPETTES': {
      // remove references to pipettes that have been deleted
      const deletedPipetteIds = action.payload
      return mapValues(
        savedStepForms,
        (form: FormData): FormData => {
          if (form.stepType === 'manualIntervention') {
            return {
              ...form,
              pipetteLocationUpdate: omit(
                form.pipetteLocationUpdate,
                deletedPipetteIds
              ),
            }
          } else if (deletedPipetteIds.includes(form.pipette as string)) {
            // TODO(IL, 2020-02-24): address in #3161, underspecified form fields may be overwritten in type-unsafe manner
            return {
              ...form,
              ...handleFormChange(
                {
                  pipette: null,
                },
                form,
                _getPipetteEntitiesRootState(rootState),
                _getLabwareEntitiesRootState(rootState)
              ),
            }
          }

          return form
        }
      )
    }

    case 'DELETE_MODULE': {
      const moduleId = action.payload.id
      return mapValues(savedStepForms, (form: FormData) => {
        if (form.stepType === 'manualIntervention') {
          const deletedModuleSlot =
            savedStepForms[INITIAL_DECK_SETUP_STEP_ID].moduleLocationUpdate[
              moduleId
            ]
          return {
            ...form,
            moduleLocationUpdate: omit(form.moduleLocationUpdate, moduleId),
            labwareLocationUpdate: mapValues(
              form.labwareLocationUpdate,
              labwareSlot =>
                labwareSlot === moduleId ? deletedModuleSlot : labwareSlot
            ),
          }
        } else if (
          (form.stepType === 'magnet' ||
            form.stepType === 'temperature' ||
            form.stepType === 'heaterShaker' ||
            form.stepType === 'absorbanceReader' ||
            form.stepType === 'thermocycler' ||
            form.stepType === 'pause') &&
          form.moduleId === moduleId
        ) {
          return { ...form, moduleId: null }
        } else {
          return form
        }
      })
    }

    case 'SUBSTITUTE_STEP_FORM_PIPETTES': {
      const { startStepId, endStepId, substitutionMap } = action.payload
      const stepIdsToUpdate = getIdsInRange(
        rootState.orderedStepIds,
        startStepId,
        endStepId
      )
      const savedStepsUpdate = stepIdsToUpdate.reduce((acc, stepId) => {
        const prevStepForm = savedStepForms[stepId]
        const shouldSubstitute = Boolean(
          prevStepForm && // pristine forms will not exist in savedStepForms
            prevStepForm.pipette &&
            prevStepForm.pipette in substitutionMap
        )
        if (!shouldSubstitute) return acc
        const updatedFields = handleFormChange(
          {
            pipette: substitutionMap[prevStepForm.pipette],
          },
          prevStepForm,
          _getPipetteEntitiesRootState(rootState),
          _getLabwareEntitiesRootState(rootState)
        )
        return {
          ...acc,
          // TODO(IL, 2020-02-24): address in #3161, underspecified form fields may be overwritten in type-unsafe manner
          [stepId]: { ...prevStepForm, ...updatedFields },
        }
      }, {})
      // TODO(IL, 2020-02-24): address in #3161, underspecified form fields may be overwritten in type-unsafe manner
      return { ...savedStepForms, ...savedStepsUpdate }
    }

    case 'CHANGE_SAVED_STEP_FORM': {
      const { stepId } = action.payload

      if (stepId == null) {
        console.assert(
          false,
          `savedStepForms got CHANGE_SAVED_STEP_FORM action without a stepId`
        )
        return savedStepForms
      }

      const previousForm = savedStepForms[stepId]

      if (previousForm.stepType === 'manualIntervention') {
        // since manualIntervention steps are nested, use a recursive merge
        return {
          ...savedStepForms,
          [stepId]: merge({}, previousForm, action.payload.update),
        }
      }

      // other step form types are not designed to be deeply merged
      // (eg `wells` arrays should be reset, not appended to)
      return {
        ...savedStepForms,
        // TODO(IL, 2020-02-24): address in #3161, underspecified form fields may be overwritten in type-unsafe manner
        [stepId]: {
          ...previousForm,
          ...handleFormChange(
            action.payload.update,
            previousForm,
            _getPipetteEntitiesRootState(rootState),
            _getLabwareEntitiesRootState(rootState)
          ),
        },
      }
    }

    case 'DUPLICATE_STEP': {
      // @ts-expect-error(sa, 2021-6-10): if  stepId is null, we will end up in situation where the entry for duplicateStepId
      // will be {[duplicateStepId]: {id: duplicateStepId}}, which will be missing the rest of the properties from FormData
      return {
        ...savedStepForms,
        [action.payload.duplicateStepId]: {
          ...cloneDeep(
            action.payload.stepId != null
              ? savedStepForms[action.payload.stepId]
              : {}
          ),
          id: action.payload.duplicateStepId,
        },
      }
    }

    case 'DUPLICATE_MULTIPLE_STEPS': {
      return action.payload.steps.reduce(
        (acc, { stepId, duplicateStepId }) => ({
          ...acc,
          [duplicateStepId]: {
            ...cloneDeep(savedStepForms[stepId]),
            id: duplicateStepId,
          },
        }),
        { ...savedStepForms }
      )
    }
    case 'REPLACE_CUSTOM_LABWARE_DEF': {
      // no mismatch, it's safe to keep all steps as they are
      if (!action.payload.isOverwriteMismatched) return savedStepForms
      // Reset all well-selection fields of any steps, where the labware of those selected wells is having its def replaced
      // (otherwise, a mismatched definition with different wells or different multi-channel arrangement can break the step forms)
      const stepIds = Object.keys(savedStepForms)

      const labwareEntities = _getLabwareEntitiesRootState(rootState)

      const labwareIdsToDeselect = Object.keys(labwareEntities).filter(
        labwareId =>
          labwareEntities[labwareId].labwareDefURI ===
          action.payload.defURIToOverwrite
      )
      const savedStepsUpdate = stepIds.reduce<SavedStepFormState>(
        (acc, stepId) => {
          const prevStepForm = savedStepForms[stepId]
          const defaults = getDefaultsForStepType(prevStepForm.stepType)

          if (!prevStepForm) {
            console.assert(false, `expected stepForm for id ${stepId}`)
            return acc
          }

          let fieldsToUpdate = {}

          if (prevStepForm.stepType === 'moveLiquid') {
            if (
              labwareIdsToDeselect.includes(
                prevStepForm.aspirate_labware as string
              )
            ) {
              fieldsToUpdate = {
                ...fieldsToUpdate,
                aspirate_wells: defaults.aspirate_wells,
              }
            }

            if (
              labwareIdsToDeselect.includes(
                prevStepForm.dispense_labware as string
              )
            ) {
              fieldsToUpdate = {
                ...fieldsToUpdate,
                dispense_wells: defaults.dispense_wells,
              }
            }
          } else if (
            prevStepForm.stepType === 'mix' &&
            labwareIdsToDeselect.includes(prevStepForm.labware as string)
          ) {
            fieldsToUpdate = {
              wells: defaults.wells,
            }
          }

          if (Object.keys(fieldsToUpdate).length === 0) {
            return acc
          }

          const updatedFields = handleFormChange(
            fieldsToUpdate,
            prevStepForm,
            _getPipetteEntitiesRootState(rootState),
            _getLabwareEntitiesRootState(rootState)
          )
          return {
            ...acc,
            // TODO(IL, 2020-02-24): address in #3161, underspecified form fields may be overwritten in type-unsafe manner
            [stepId]: { ...prevStepForm, ...updatedFields },
          }
        },
        {}
      )
      return { ...savedStepForms, ...savedStepsUpdate }
    }

    default:
      return savedStepForms
  }
}
export type BatchEditFormChangesState = FormPatch
type BatchEditFormActions =
  | ChangeBatchEditFieldAction
  | ResetBatchEditFieldChangesAction
  | SaveStepFormsMultiAction
  | SelectStepAction
  | SelectMultipleStepsAction
  | DuplicateMultipleStepsAction
  | DeleteMultipleStepsAction
export const batchEditFormChanges = (
  state: BatchEditFormChangesState = {},
  action: BatchEditFormActions
): BatchEditFormChangesState => {
  switch (action.type) {
    case 'CHANGE_BATCH_EDIT_FIELD': {
      return { ...state, ...action.payload }
    }

    case 'SELECT_STEP':
    case 'SAVE_STEP_FORMS_MULTI':
    case 'SELECT_MULTIPLE_STEPS':
    case 'DUPLICATE_MULTIPLE_STEPS':
    case 'DELETE_MULTIPLE_STEPS':
    case 'RESET_BATCH_EDIT_FIELD_CHANGES': {
      return {}
    }

    default: {
      return state
    }
  }
}

const initialLabwareState: NormalizedLabwareById = {}
// MIGRATION NOTE: copied from `containers` reducer. Slot + UI stuff stripped out.
export const labwareInvariantProperties: Reducer<
  NormalizedLabwareById,
  any
  // @ts-expect-error(sa, 2021-6-10): cannot use string literals as action type
  // TODO IMMEDIATELY: refactor this to the old fashioned way if we cannot have type safety: https://github.com/redux-utilities/redux-actions/issues/282#issuecomment-595163081
> = handleActions(
  {
    CREATE_CONTAINER: (
      state: NormalizedLabwareById,
      action: CreateContainerAction
    ) => {
      const { payload } = action
      const { labwareDefURI, id, displayCategory } = payload

      const categoryLength = Object.values(state).filter(
        labware => labware.displayCategory === displayCategory
      ).length

      return {
        ...state,
        [id]: {
          labwareDefURI,
          displayCategory,
          pythonName: `${getLabwarePythonName(
            displayCategory,
            categoryLength + 1
          )}`,
        },
      }
    },
    DUPLICATE_LABWARE: (
      state: NormalizedLabwareById,
      action: DuplicateLabwareAction
    ) => {
      const { payload } = action
      const { duplicateLabwareId, templateLabwareId, displayCategory } = payload

      const categoryLength = Object.values(state).filter(
        labware => labware.displayCategory === displayCategory
      ).length

      return {
        ...state,
        [duplicateLabwareId]: {
          labwareDefURI: state[templateLabwareId].labwareDefURI,
          displayCategory,
          pythonName: `${getLabwarePythonName(
            displayCategory,
            categoryLength + 1
          )}`,
        },
      }
    },
    DELETE_CONTAINER: (
      state: NormalizedLabwareById,
      action: DeleteContainerAction
    ): NormalizedLabwareById => {
      return omit(state, action.payload.labwareId)
    },
    LOAD_FILE: (
      state: NormalizedLabwareById,
      action: LoadFileAction
    ): NormalizedLabwareById => {
      const { file } = action.payload
      const metadata = getPDMetadata(file)
      const labwareDefinitions = file.labwareDefinitions

      const labware: NormalizedLabwareById = Object.entries(
        metadata.labware
      ).reduce((acc: NormalizedLabwareById, [id, labwareLoadInfo]) => {
        if (labwareDefinitions[labwareLoadInfo.labwareDefURI] == null) {
          console.error(
            `expected to find matching labware definiton with labwareDefURI ${labwareLoadInfo.labwareDefURI} but could not`
          )
        }
        const displayCategory =
          labwareDefinitions[labwareLoadInfo.labwareDefURI]?.metadata
            .displayCategory ?? 'otherLabware'

        const displayCategoryCount = Object.values(acc).filter(
          lw => lw.displayCategory === displayCategory
        ).length

        acc[id] = {
          labwareDefURI: labwareLoadInfo.labwareDefURI,
          pythonName: getLabwarePythonName(
            displayCategory,
            displayCategoryCount + 1
          ),
          displayCategory,
        }

        return acc
      }, {})

      return { ...labware, ...state }
    },
    EDIT_MULTIPLE_LABWARE_PYTHON_NAME: (
      state: NormalizedLabwareById,
      action: EditMultipleLabwareAction
    ): NormalizedLabwareById => {
      return {
        ...state,
        ...action.payload,
      }
    },
    REPLACE_CUSTOM_LABWARE_DEF: (
      state: NormalizedLabwareById,
      action: ReplaceCustomLabwareDef
    ): NormalizedLabwareById => {
      const { payload } = action
      const { newDef, defURIToOverwrite } = payload
      const displayCategory = newDef.metadata.displayCategory
      const categoryLength = Object.values(state).filter(
        labware => labware.displayCategory === displayCategory
      ).length

      const mappedLabware = mapValues(
        state,
        (prev: NormalizedLabware): NormalizedLabware =>
          defURIToOverwrite === prev.labwareDefURI
            ? {
                ...prev,
                labwareDefURI: getLabwareDefURI(newDef),
                pythonName: getLabwarePythonName(
                  displayCategory,
                  categoryLength + 1
                ),
                displayCategory,
              }
            : prev
      )
      return mappedLabware
    },
  },
  initialLabwareState
)
export const moduleInvariantProperties: Reducer<
  ModuleEntities,
  any
  // @ts-expect-error(sa, 2021-6-10): cannot use string literals as action type
  // TODO IMMEDIATELY: refactor this to the old fashioned way if we cannot have type safety: https://github.com/redux-utilities/redux-actions/issues/282#issuecomment-595163081
> = handleActions(
  {
    CREATE_MODULE: (
      state: ModuleEntities,
      action: CreateModuleAction
    ): ModuleEntities => {
      const type = action.payload.type
      const typeCount = Object.values(state).filter(
        module => module.type === type
      ).length

      return {
        ...state,
        [action.payload.id]: {
          id: action.payload.id,
          type,
          model: action.payload.model,
          pythonName: getModulePythonName(type, typeCount + 1),
        },
      }
    },

    EDIT_MODULE: (
      state: ModuleEntities,
      action: EditModuleAction
    ): ModuleEntities => ({
      ...state,
      [action.payload.id]: {
        ...state[action.payload.id],
        model: action.payload.model,
      },
    }),
    DELETE_MODULE: (
      state: ModuleEntities,
      action: DeleteModuleAction
    ): ModuleEntities => omit(state, action.payload.id),
    EDIT_MULTIPLE_MODULES_PYTHON_NAME: (
      state: ModuleEntities,
      action: EditMultipleModulesAction
    ): ModuleEntities => {
      return {
        ...state,
        ...action.payload,
      }
    },
    LOAD_FILE: (
      state: ModuleEntities,
      action: LoadFileAction
    ): ModuleEntities => {
      const { file } = action.payload
      const metadata = getPDMetadata(file)
      const modules: ModuleEntities = Object.entries(metadata.modules).reduce(
        (acc: ModuleEntities, [id, moduleLoadInfo]) => {
          const moduleType = getModuleType(moduleLoadInfo.model)
          const typeCount = Object.values(acc).filter(
            module => module.type === moduleType
          ).length

          acc[id] = {
            id,
            type: moduleType,
            model: moduleLoadInfo.model,
            pythonName: getModulePythonName(moduleType, typeCount + 1),
          }

          return acc
        },
        {}
      )

      return Object.keys(modules).length > 0 ? modules : state
    },
  },
  {}
)
const initialPipetteState = {}
export const pipetteInvariantProperties: Reducer<
  NormalizedPipetteById,
  any
  // @ts-expect-error(sa, 2021-6-10): cannot use string literals as action type
> = handleActions(
  {
    LOAD_FILE: (
      state: NormalizedPipetteById,
      action: LoadFileAction
    ): NormalizedPipetteById => {
      const { file } = action.payload
      const metadata = getPDMetadata(file)
      const pipettes = Object.entries(metadata.pipettes).reduce(
        (
          acc: NormalizedPipetteById,
          [id, pipetteLoadInfo]: [string, PipetteLoadInfo]
        ) => {
          const tiprackDefURI = metadata.pipetteTiprackAssignments[id]

          return {
            ...acc,
            [id]: {
              id,
              name: pipetteLoadInfo.pipetteName as PipetteName,
              tiprackDefURI,
            },
          }
        },
        {}
      )
      return Object.keys(pipettes).length > 0 ? pipettes : state
    },
    CREATE_PIPETTES: (
      state: NormalizedPipetteById,
      action: CreatePipettesAction
    ): NormalizedPipetteById => {
      return { ...state, ...action.payload }
    },
    DELETE_PIPETTES: (
      state: NormalizedPipetteById,
      action: DeletePipettesAction
    ): NormalizedPipetteById => {
      return omit(state, action.payload)
    },
  },
  initialPipetteState
)

const initialAdditionalEquipmentState = {}

export const additionalEquipmentInvariantProperties = handleActions<NormalizedAdditionalEquipmentById>(
  {
    //  @ts-expect-error
    LOAD_FILE: (
      state,
      action: LoadFileAction
    ): NormalizedAdditionalEquipmentById => {
      const { file } = action.payload
      const savedStepForms = file.designerApplication?.data?.savedStepForms
      const initialDeckSetup: AdditionalEquipmentLocationUpdate = savedStepForms?.[
        INITIAL_DECK_SETUP_STEP_ID
      ] as any
      const {
        gripperLocationUpdate,
        trashBinLocationUpdate,
        wasteChuteLocationUpdate,
        stagingAreaLocationUpdate,
      } = initialDeckSetup

      let gripper
      if (Object.keys(gripperLocationUpdate).length > 0) {
        const id = Object.keys(gripperLocationUpdate)[0]
        gripper = {
          [id]: {
            name: 'gripper' as const,
            id,
            location: GRIPPER_LOCATION,
          },
        }
      }
      let trashBin
      if (Object.keys(trashBinLocationUpdate).length > 0) {
        trashBin = Object.entries(trashBinLocationUpdate).reduce(
          (acc, [id, location], index) => ({
            ...acc,
            [id]: {
              name: 'trashBin' as const,
              id,
              location,
              pythonName: getAdditionalEquipmentPythonName(
                'trashBin',
                index + 1
              ),
            },
          }),
          {}
        )
      }
      let wasteChute
      if (Object.keys(wasteChuteLocationUpdate).length > 0) {
        const id = Object.keys(wasteChuteLocationUpdate)[0]
        wasteChute = {
          [id]: {
            name: 'wasteChute' as const,
            id,
            location: Object.values(wasteChuteLocationUpdate)[0],
            pythonName: getAdditionalEquipmentPythonName('wasteChute', 1),
          },
        }
      }
      let stagingArea
      if (Object.keys(stagingAreaLocationUpdate).length > 0) {
        stagingArea = Object.entries(stagingAreaLocationUpdate).reduce(
          (acc, [id, location]) => ({
            ...acc,
            [id]: {
              name: 'stagingArea' as const,
              id,
              location,
            },
          }),
          {}
        )
      }

      return {
        ...state,
        ...trashBin,
        ...wasteChute,
        ...gripper,
        ...stagingArea,
      }
    },
    //  @ts-expect-error
    TOGGLE_IS_GRIPPER_REQUIRED: (
      state: NormalizedAdditionalEquipmentById,
      action: ToggleIsGripperRequiredAction
    ): NormalizedAdditionalEquipmentById => {
      let updatedEquipment = { ...state }
      const id = action.payload.id
      const gripperKey = Object.keys(updatedEquipment).find(
        key => updatedEquipment[key].name === 'gripper'
      )

      if (gripperKey != null) {
        updatedEquipment = omit(updatedEquipment, [gripperKey])
      } else {
        updatedEquipment = {
          ...updatedEquipment,
          [id]: {
            name: 'gripper' as const,
            id,
            location: GRIPPER_LOCATION,
          },
        }
      }
      return updatedEquipment
    },
    //  @ts-expect-error
    CREATE_DECK_FIXTURE: (
      state: NormalizedAdditionalEquipmentById,
      action: CreateDeckFixtureAction
    ): NormalizedAdditionalEquipmentById => {
      const { location, id, name } = action.payload
      const typeCount = Object.values(state).filter(aE => aE.name === name)
        .length

      return {
        ...state,
        [id]: {
          name,
          id,
          location,
          pythonName:
            name === 'stagingArea'
              ? undefined
              : getAdditionalEquipmentPythonName(name, typeCount + 1),
        },
      }
    },
    //  @ts-expect-error
    DELETE_DECK_FIXTURE: (
      state: NormalizedAdditionalEquipmentById,
      action: DeleteDeckFixtureAction
    ): NormalizedAdditionalEquipmentById => omit(state, action.payload.id),
    DEFAULT: (): NormalizedAdditionalEquipmentById => ({}),
  },
  initialAdditionalEquipmentState
)
export const ADD_STEPS_TO_GROUP = 'ADD_STEPS_TO_GROUP'
export const CREATE_GROUP = 'CREATE_GROUP'
export const REMOVE_GROUP = 'REMOVE_GROUP'
export type StepGroupsState = Record<string, StepIdType[]>
const initialStepGroupState = {}
const stepGroups: Reducer<StepGroupsState, any> = handleActions<
  StepGroupsState,
  any
>(
  {
    CREATE_GROUP: (state, action) => {
      return {
        ...state,
        [action.payload.groupName]: [],
      }
    },
    REMOVE_GROUP: (state, action) => {
      const {
        [action.payload.groupName]: removedGroup,
        ...remainingGroups
      } = state
      return remainingGroups
    },
    ADD_STEPS_TO_GROUP: (state, action) => {
      return {
        ...state,
        [action.payload.groupName]: [
          ...state[action.payload.groupName],
          ...action.payload.stepIds,
        ],
      }
    },
  },
  initialStepGroupState
)
export type UnsavedGroupState = StepIdType[]
export const SELECT_STEP_FOR_UNSAVED_GROUP = 'SELECT_STEP_FOR_UNSAVED_GROUP'
export const CLEAR_UNSAVED_GROUP = 'CLEAR_UNSAVED_GROUP'
const initialUnsavedGroupState: StepIdType[] = []
const unsavedGroup: Reducer<UnsavedGroupState, any> = handleActions<
  UnsavedGroupState,
  any
>(
  {
    SELECT_STEP_FOR_UNSAVED_GROUP: (state, action) => {
      const stepId: string = action.payload.stepId
      if (state.includes(stepId)) {
        return state.filter(id => id !== stepId)
      } else {
        return [...state, stepId]
      }
    },
    CLEAR_UNSAVED_GROUP: () => {
      return []
    },
  },
  initialUnsavedGroupState
)

export type OrderedStepIdsState = StepIdType[]
const initialOrderedStepIdsState: string[] = []
// @ts-expect-error(sa, 2021-6-10): cannot use string literals as action type
// TODO IMMEDIATELY: refactor this to the old fashioned way if we cannot have type safety: https://github.com/redux-utilities/redux-actions/issues/282#issuecomment-595163081
export const orderedStepIds: Reducer<OrderedStepIdsState, any> = handleActions(
  {
    SAVE_STEP_FORM: (
      state: OrderedStepIdsState,
      action: SaveStepFormAction
    ) => {
      const id = action.payload.id

      if (!state.includes(id)) {
        return [...state, id]
      }

      return state
    },
    DELETE_STEP: (state: OrderedStepIdsState, action: DeleteStepAction) =>
      state.filter(stepId => stepId !== action.payload),
    DELETE_MULTIPLE_STEPS: (
      state: OrderedStepIdsState,
      action: DeleteMultipleStepsAction
    ) => state.filter(id => !action.payload.includes(id)),
    LOAD_FILE: (
      state: OrderedStepIdsState,
      action: LoadFileAction
    ): OrderedStepIdsState => getPDMetadata(action.payload.file).orderedStepIds,
    REORDER_SELECTED_STEP: (
      state: OrderedStepIdsState,
      action: ReorderSelectedStepAction
    ): OrderedStepIdsState => {
      // TODO: BC 2018-11-27 make util function for reordering and use it everywhere
      const { delta, stepId } = action.payload
      const stepsWithoutSelectedStep = state.filter(s => s !== stepId)
      const selectedIndex = state.findIndex(s => s === stepId)
      const nextIndex = selectedIndex + delta
      if (delta <= 0 && selectedIndex === 0) return state
      return [
        ...stepsWithoutSelectedStep.slice(0, nextIndex),
        stepId,
        ...stepsWithoutSelectedStep.slice(nextIndex),
      ]
    },
    DUPLICATE_STEP: (
      state: OrderedStepIdsState,
      action: DuplicateStepAction
    ): OrderedStepIdsState => {
      const { stepId, duplicateStepId } = action.payload
      const selectedIndex = state.findIndex(s => s === stepId)
      return [
        ...state.slice(0, selectedIndex + 1),
        duplicateStepId,
        ...state.slice(selectedIndex + 1, state.length),
      ]
    },
    DUPLICATE_MULTIPLE_STEPS: (
      state: OrderedStepIdsState,
      action: DuplicateMultipleStepsAction
    ): OrderedStepIdsState => {
      const duplicateStepIds = action.payload.steps.map(
        ({ duplicateStepId }) => duplicateStepId
      )
      const { indexToInsert } = action.payload
      return [
        ...state.slice(0, indexToInsert),
        ...duplicateStepIds,
        ...state.slice(indexToInsert, state.length),
      ]
    },
    REORDER_STEPS: (
      state: OrderedStepIdsState,
      action: ReorderStepsAction
    ): OrderedStepIdsState => action.payload.stepIds,
  },
  initialOrderedStepIdsState
)
export type PresavedStepFormState = {
  stepType: StepType
} | null
export type PresavedStepFormAction =
  | AddStepAction
  | CancelStepFormAction
  | DeleteStepAction
  | DeleteMultipleStepsAction
  | SaveStepFormAction
  | SelectTerminalItemAction
  | SelectStepAction
  | SelectMultipleStepsAction
export const presavedStepForm = (
  state: PresavedStepFormState = null,
  action: PresavedStepFormAction
): PresavedStepFormState => {
  switch (action.type) {
    case 'ADD_STEP':
      return {
        stepType: action.payload.stepType,
      }

    case 'SELECT_TERMINAL_ITEM':
      return action.payload === PRESAVED_STEP_ID ? state : null

    case 'CANCEL_STEP_FORM':
    case 'DELETE_STEP':
    case 'DELETE_MULTIPLE_STEPS':
    case 'SAVE_STEP_FORM':
    case 'SELECT_STEP':
    case 'SELECT_MULTIPLE_STEPS':
      return null

    default:
      return state
  }
}
export interface RootState {
  unsavedGroup: UnsavedGroupState
  stepGroups: StepGroupsState
  orderedStepIds: OrderedStepIdsState
  labwareDefs: LabwareDefsRootState
  labwareInvariantProperties: NormalizedLabwareById
  pipetteInvariantProperties: NormalizedPipetteById
  moduleInvariantProperties: ModuleEntities
  additionalEquipmentInvariantProperties: NormalizedAdditionalEquipmentById
  presavedStepForm: PresavedStepFormState
  savedStepForms: SavedStepFormState
  unsavedForm: FormState
  batchEditFormChanges: BatchEditFormChangesState
}
// TODO Ian 2018-12-13: find some existing util to do this
// semi-nested version of combineReducers?
// TODO: Ian 2018-12-13 remove this 'action: any' type
export const rootReducer: Reducer<RootState, any> = nestedCombineReducers(
  ({ action, state, prevStateFallback }) => ({
    unsavedGroup: unsavedGroup(prevStateFallback.unsavedGroup, action),
    stepGroups: stepGroups(prevStateFallback.stepGroups, action),
    orderedStepIds: orderedStepIds(prevStateFallback.orderedStepIds, action),
    labwareInvariantProperties: labwareInvariantProperties(
      prevStateFallback.labwareInvariantProperties,
      action
    ),
    pipetteInvariantProperties: pipetteInvariantProperties(
      prevStateFallback.pipetteInvariantProperties,
      action
    ),
    moduleInvariantProperties: moduleInvariantProperties(
      prevStateFallback.moduleInvariantProperties,
      action
    ),
    additionalEquipmentInvariantProperties: additionalEquipmentInvariantProperties(
      prevStateFallback.additionalEquipmentInvariantProperties,
      action as ReduxActionsAction<NormalizedAdditionalEquipmentById>
    ),
    labwareDefs: labwareDefsRootReducer(
      prevStateFallback.labwareDefs,
      action as Action
    ),
    // 'forms' reducers get full rootReducer state
    savedStepForms: savedStepForms(state, action as SavedStepFormsActions),
    unsavedForm: unsavedForm(state, action as UnsavedFormActions),
    presavedStepForm: presavedStepForm(
      prevStateFallback.presavedStepForm,
      action as PresavedStepFormAction
    ),
    batchEditFormChanges: batchEditFormChanges(
      prevStateFallback.batchEditFormChanges,
      action as BatchEditFormActions
    ),
  })
)
