import * as React from 'react'

import { AlertModal } from '@opentrons/components'
import { Portal } from '../../../App/portal'
import styles from './styles.css'

import {
  INVALID_LABWARE_FILE,
  DUPLICATE_LABWARE_FILE,
  OPENTRONS_LABWARE_FILE,
} from '../../../redux/custom-labware'

import type {
  FailedLabwareFile,
  DuplicateLabwareFile,
} from '../../../redux/custom-labware/types'

// TODO(mc, 2019-11-20): i18n
// buttons
const CANCEL = 'cancel'
const OVERWRITE_LABWARE = 'overwrite labware'

// headings
const UNABLE_TO_ADD_LABWARE = 'Unable to add labware'
const INVALID_LABWARE_DEFINITION = 'Invalid labware definition'
const CONFLICT_WITH_OPENTRONS_LABWARE = 'Conflict with Opentrons labware'
const OVERWRITE_DUPLICATE_LABWARE = 'Overwrite duplicate labware?'

// copy
const UNABLE_TO_COPY_LABWARE_FILE_TO = 'Unable to copy labware file to'
const PLEASE_CHECK_PERMISSIONS =
  'Please check that you are able to open this file and add files to your labware source folder, or contact Opentrons Support for help.'
const THE_FILE = 'The file'
const IS_NOT_A_VALID_LABWARE_DEFINITION =
  'is not a valid Opentrons labware definition. Please check that you selected to correct file.'
const THIS_LABWARE_DEFINITION_CONFLICTS =
  'This labware definition conflicts with an Opentrons standard definition. If you are trying to create a new labware based on an Opentrons definition, please contact support.'
const A_LABWARE_DEFINITION_ALREADY_EXISTS =
  'A labware definition with the same API name, version, and namespace already exists in your labware source folder. Would you like to overwrite it?'
const CLICKING_OVERWRITE_LABWARE_WILL_DELETE_FILES =
  'Clicking "Overwrite Labware" will delete any existing files that conflict with the new file'

const DISPLAY_NAME = 'Name: '
const API_NAME = 'API name: '
const FILENAME = 'File name: '

export interface AddLabwareFailureModalProps {
  file: FailedLabwareFile | null
  errorMessage: string | null
  directory: string
  onCancel: () => unknown
  onOverwrite: (file: DuplicateLabwareFile) => unknown
}

const renderFilename = (file: FailedLabwareFile): JSX.Element => (
  <span className={styles.code}>{file.filename}</span>
)

const renderDetails = (file: FailedLabwareFile): JSX.Element => (
  <>
    <ul className={styles.details_list}>
      <li className={styles.list_item}>
        <span className={styles.list_item_title}>{DISPLAY_NAME}</span>
        {/* @ts-expect-error TODO: file.definition does not exist if failed file is of type InvalidLabwareFile */}
        <span>{file.definition.metadata.displayName}</span>
      </li>
      <li className={styles.list_item}>
        <span className={styles.list_item_title}>{API_NAME}</span>
        <span className={styles.code}>
          {/* @ts-expect-error TODO: file.definition does not exist if failed file is of type InvalidLabwareFile */}
          {file.definition.parameters.loadName}
        </span>
      </li>
      <li className={styles.list_item}>
        <span className={styles.list_item_title}>{FILENAME}</span>
        <span>{renderFilename(file)}</span>
      </li>
    </ul>
  </>
)

export function AddLabwareFailureModalTemplate(
  props: AddLabwareFailureModalProps
): JSX.Element {
  const { file, errorMessage, directory, onCancel, onOverwrite } = props
  let buttons = [
    { onClick: onCancel, children: CANCEL, className: styles.button },
  ]
  let heading = null
  let children = null

  if (!file || errorMessage) {
    heading = UNABLE_TO_ADD_LABWARE
    children = (
      <>
        <p>
          {UNABLE_TO_COPY_LABWARE_FILE_TO}{' '}
          <span className={styles.code}>{directory}</span>
          {'. '}
          {PLEASE_CHECK_PERMISSIONS}
        </p>
        {errorMessage && <p className={styles.error}>{errorMessage}</p>}
      </>
    )
  } else if (file.type === INVALID_LABWARE_FILE) {
    heading = INVALID_LABWARE_DEFINITION
    children = (
      <p>
        {THE_FILE} {renderFilename(file)} {IS_NOT_A_VALID_LABWARE_DEFINITION}
      </p>
    )
  } else if (file.type === OPENTRONS_LABWARE_FILE) {
    heading = CONFLICT_WITH_OPENTRONS_LABWARE
    children = (
      <>
        <p>{THIS_LABWARE_DEFINITION_CONFLICTS}</p>
        {renderDetails(file)}
      </>
    )
  } else if (file.type === DUPLICATE_LABWARE_FILE) {
    buttons = [
      ...buttons,
      {
        className: styles.button,
        children: OVERWRITE_LABWARE,
        onClick: () => onOverwrite(file),
      },
    ]
    heading = OVERWRITE_DUPLICATE_LABWARE
    children = (
      <>
        <p>{A_LABWARE_DEFINITION_ALREADY_EXISTS}</p>
        {renderDetails(file)}
        <p>{CLICKING_OVERWRITE_LABWARE_WILL_DELETE_FILES}</p>
      </>
    )
  }

  return (
    <AlertModal alertOverlay heading={heading} buttons={buttons}>
      {children}
    </AlertModal>
  )
}

export function AddLabwareFailureModal(
  props: AddLabwareFailureModalProps
): JSX.Element {
  return (
    <Portal>
      <AddLabwareFailureModalTemplate {...props} />
    </Portal>
  )
}
