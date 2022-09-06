import * as React from 'react'
import capitalize from 'lodash/capitalize'

import { ModalPage } from '@opentrons/components'
import { shouldLevel } from '@opentrons/shared-data'
import { DeprecatedPipetteSelection } from './DeprecatedPipetteSelection'
import { DeprecatedInstructionStep } from './DeprecatedInstructionStep'
import { CheckPipettesButton } from './CheckPipettesButton'
import styles from './styles.css'

import type {
  PipetteNameSpecs,
  PipetteModelSpecs,
  PipetteDisplayCategory,
} from '@opentrons/shared-data'
import type { Mount } from '../../redux/pipettes/types'
import type { Direction } from './types'

const ATTACH_CONFIRM = 'have robot check connection'
const DETACH_CONFIRM = 'confirm pipette is detached'
const EXIT = 'exit'

interface Props {
  title: string
  subtitle: string
  robotName: string
  mount: Mount
  wantedPipette: PipetteNameSpecs | null
  actualPipette: PipetteModelSpecs | null
  displayName: string
  displayCategory: PipetteDisplayCategory | null
  direction: Direction
  setWantedName: (name: string | null) => unknown
  confirm: () => unknown
  exit: () => unknown
}

/**
 * @deprecated use Instructions instead
 */
export function DeprecatedInstructions(props: Props): JSX.Element {
  const {
    title,
    subtitle,
    robotName,
    wantedPipette,
    actualPipette,
    setWantedName,
    direction,
    displayName,
    confirm,
    exit,
  } = props

  const heading = `${capitalize(direction)} ${displayName} Pipette`
  const titleBar = {
    title: title,
    subtitle: subtitle,
    back:
      wantedPipette != null
        ? { onClick: () => setWantedName(null) }
        : { onClick: exit, children: EXIT },
  }

  return (
    <ModalPage
      titleBar={titleBar}
      heading={heading}
      contentsClassName={styles.modal_contents}
    >
      {!actualPipette && !wantedPipette && (
        <DeprecatedPipetteSelection onPipetteChange={setWantedName} />
      )}
      {(actualPipette || wantedPipette) && <Steps {...props} />}
      <CheckPipettesButton
        className={styles.check_pipette_button}
        robotName={robotName}
        onDone={confirm}
        hidden={actualPipette == null && wantedPipette == null}
      >
        {actualPipette ? DETACH_CONFIRM : ATTACH_CONFIRM}
      </CheckPipettesButton>
    </ModalPage>
  )
}

function Steps(props: Props): JSX.Element {
  const {
    direction,
    mount,
    displayCategory,
    actualPipette,
    wantedPipette,
  } = props

  const channels = actualPipette
    ? actualPipette.channels
    : wantedPipette?.channels || 1

  let stepOne
  let stepTwo

  if (direction === 'detach') {
    stepOne = 'Loosen screws.'
    stepTwo = (
      <div>
        <p className={styles.step_copy}>
          <strong>Hold on to pipette</strong> so it does not drop.
        </p>
        <p>
          Disconnect the pipette from robot by pulling the white connector tab.
        </p>
      </div>
    )
  } else {
    if (wantedPipette && shouldLevel(wantedPipette)) {
      stepOne = (
        <p>
          <em>Loosely</em> attach pipette to carriage,{' '}
          <strong>starting with screw 1</strong>
        </p>
      )
    } else {
      stepOne = (
        <p>
          Attach pipette to mount, <strong>starting with screw 1</strong>.
        </p>
      )
    }
    stepTwo =
      'Connect the pipette to robot by pushing in the white connector tab.'
  }

  return (
    <div className={styles.instructions}>
      <DeprecatedInstructionStep
        step="one"
        diagram="screws"
        {...{ direction, mount, channels, displayCategory }}
      >
        {stepOne}
      </DeprecatedInstructionStep>
      <DeprecatedInstructionStep
        step="two"
        diagram="tab"
        {...{ direction, mount, channels, displayCategory }}
      >
        {stepTwo}
      </DeprecatedInstructionStep>
    </div>
  )
}
