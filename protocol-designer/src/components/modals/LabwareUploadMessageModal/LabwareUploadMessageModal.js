// @flow
import assert from 'assert'
import * as React from 'react'
import { AlertModal, OutlineButton } from '@opentrons/components'
import i18n from '../../../localization'
import modalStyles from '../modal.css'
import type { LabwareUploadMessage } from '../../../labware-defs'

const MessageBody = (props: {| message: LabwareUploadMessage |}) => {
  const { message } = props

  if (message.messageType === 'NOT_JSON') {
    return (
      <p>
        The Protocol Designer only accepts custom JSON labware definitions made
        with our Labware Creator. This is not a .json file!
      </p>
    )
  } else if (message.messageType === 'INVALID_JSON_FILE') {
    return (
      <>
        <p>
          The Protocol Designer only accepts custom JSON labware definitions
          made with our Labware Creator
        </p>
        {message.errorText ? <p>{message.errorText}</p> : null}
      </>
    )
  } else if (message.messageType === 'EXACT_LABWARE_MATCH') {
    return <p>This labware is identical to one you have already uploaded.</p>
  } else if (
    message.messageType === 'ASK_FOR_LABWARE_OVERWRITE' ||
    message.messageType === 'LABWARE_NAME_CONFLICT'
  ) {
    const { defsMatchingDisplayName, defsMatchingLoadName } = message
    const canOverwrite = message.messageType === 'ASK_FOR_LABWARE_OVERWRITE'
    return (
      <>
        <p>
          This labware shares an API Load name and/or a display name with{' '}
          {canOverwrite ? 'custom' : 'Opentrons standard'} labware that has
          already been uploaded.
        </p>
        {canOverwrite && defsMatchingLoadName.length > 0 ? (
          <p>
            <strong>
              Shared load name:{' '}
              {defsMatchingLoadName
                .map(def => def?.parameters?.loadName || '?')
                .join(', ')}
            </strong>
          </p>
        ) : null}
        {canOverwrite && defsMatchingDisplayName.length > 0 ? (
          <p>
            <strong>
              Shared display name:{' '}
              {defsMatchingDisplayName
                .map(def => def?.metadata?.displayName || '?')
                .join(', ')}
            </strong>
          </p>
        ) : null}
        <p>
          If you wish to add this labware then please return to the Labware
          Creator and export it again with a unique load name and display name.
        </p>
        {canOverwrite && (
          <p>
            If you intended to replace your previous labware with this new
            version then proceed with the Overwrite button below.
          </p>
        )}
      </>
    )
  } else if (message.messageType === 'LABWARE_NAME_CONFLICT') {
    return (
      <>
        <p>
          This labware shares an API Load name and/or a display name with
          Opentrons standard labware.
        </p>
        <p>
          If you wish to add this labware then please return to the Labware
          Creator and export it again with a unique load name and display name.
        </p>
      </>
    )
  }
  assert(false, `MessageBody got unhandled messageType: ${message.messageType}`)
  return null
}

type Props = {|
  message: ?LabwareUploadMessage,
  dismissModal: () => mixed,
  overwriteLabware?: () => mixed,
|}

const LabwareUploadMessageModal = (props: Props) => {
  const { message, dismissModal, overwriteLabware } = props
  if (!message) return null

  let buttons = [{ children: 'OK', onClick: dismissModal }]
  if (message.messageType === 'ASK_FOR_LABWARE_OVERWRITE') {
    buttons = [
      { children: 'CANCEL IMPORT', onClick: dismissModal },
      { children: 'OVERWRITE LABWARE', onClick: overwriteLabware },
    ]
  }

  return (
    <AlertModal
      heading={i18n.t(
        `modal.labware_upload_message.title.${message.messageType}`
      )}
      className={modalStyles.modal}
      alertOverlay
    >
      <MessageBody message={message} />
      {buttons.map((button, index) => (
        <OutlineButton
          {...button}
          key={index}
          className={modalStyles.bottom_button}
        />
      ))}
    </AlertModal>
  )
}

export default LabwareUploadMessageModal
