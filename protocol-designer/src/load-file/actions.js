// @flow
import migrateFile from './migration'
import type { PDProtocolFile } from '../file-types'
import type { GetState, ThunkAction, ThunkDispatch } from '../types'
import type {
  FileUploadErrorType,
  FileUploadMessage,
  LoadFileAction,
  NewProtocolFields,
} from './types'

export type FileUploadMessageAction = {
  type: 'FILE_UPLOAD_MESSAGE',
  payload: FileUploadMessage,
}

export const fileUploadMessage = (
  payload: FileUploadMessage
): FileUploadMessageAction => ({
  type: 'FILE_UPLOAD_MESSAGE',
  payload,
})

export const dismissFileUploadMessage = () => ({
  type: 'DISMISS_FILE_UPLOAD_MESSAGE',
})

// expects valid, parsed JSON protocol.
export const loadFileAction = (payload: PDProtocolFile): LoadFileAction => ({
  type: 'LOAD_FILE',
  payload: migrateFile(payload),
})

// load file thunk, handles file loading errors
export const loadProtocolFile = (
  event: SyntheticInputEvent<HTMLInputElement>
): ThunkAction<*> => (dispatch: ThunkDispatch<*>, getState: GetState) => {
  const fileError = (errorType: FileUploadErrorType, errorMessage?: string) =>
    dispatch(fileUploadMessage({ isError: true, errorType, errorMessage }))

  const file = event.currentTarget.files[0]
  const reader = new FileReader()

  // reset the state of the input to allow file re-uploads
  event.currentTarget.value = ''

  if (!file.name.endsWith('.json')) {
    fileError('INVALID_FILE_TYPE')
  } else {
    reader.onload = readEvent => {
      const result = readEvent.currentTarget.result
      let parsedProtocol: ?PDProtocolFile

      try {
        parsedProtocol = JSON.parse(result)
        // TODO LATER Ian 2018-05-18 validate file with JSON Schema here
        dispatch(loadFileAction(parsedProtocol))
      } catch (error) {
        console.error(error)
        fileError('INVALID_JSON_FILE', error.message)
      }
    }
    reader.readAsText(file)
  }
}

export type CreateNewProtocolAction = {
  type: 'CREATE_NEW_PROTOCOL',
  payload: NewProtocolFields,
}

export const createNewProtocol = (
  payload: $PropertyType<CreateNewProtocolAction, 'payload'>
): CreateNewProtocolAction => ({
  type: 'CREATE_NEW_PROTOCOL',
  payload,
})

export const saveProtocolFile = () => ({
  type: 'SAVE_PROTOCOL_FILE',
})
