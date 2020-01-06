// @flow
import * as React from 'react'
import capitalize from 'lodash/capitalize'

import { ModalPage } from '@opentrons/components'
import PipetteSelection from './PipetteSelection'
import { InstructionStep } from './InstructionStep'
import { CheckPipettesButton } from './CheckPipettesButton'
import styles from './styles.css'

import type {
  PipetteNameSpecs,
  PipetteModelSpecs,
  PipetteDisplayCategory,
} from '@opentrons/shared-data'
import type { Mount } from '../../pipettes/types'
import type { Direction } from './types'

const ATTACH_CONFIRM = 'have robot check connection'
const DETACH_CONFIRM = 'confirm pipette is detached'
const EXIT = 'exit'

type Props = {|
  title: string,
  subtitle: string,
  robotName: string,
  mount: Mount,
  wantedPipette: PipetteNameSpecs | null,
  actualPipette: PipetteModelSpecs | null,
  displayName: string,
  displayCategory: PipetteDisplayCategory | null,
  direction: Direction,
  setWantedName: (name: string | null) => mixed,
  confirm: () => mixed,
  exit: () => mixed,
|}

export function Instructions(props: Props) {
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
    back: wantedPipette
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
        <PipetteSelection
          onPipetteChange={specs => setWantedName(specs ? specs.name : null)}
        />
      )}

      {(actualPipette || wantedPipette) && (
        <div>
          <Steps {...props} />
          <CheckPipettesButton
            className={styles.check_pipette_button}
            robotName={robotName}
            onDone={confirm}
          >
            {actualPipette ? DETACH_CONFIRM : ATTACH_CONFIRM}
          </CheckPipettesButton>
        </div>
      )}
    </ModalPage>
  )
}

function Steps(props: Props) {
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
    stepOne = (
      <p>
        Attach pipette to mount, <strong>starting with screw 1</strong>.
      </p>
    )
    stepTwo =
      'Connect the pipette to robot by pushing in the white connector tab.'
  }

  return (
    <div className={styles.instructions}>
      <InstructionStep
        step="one"
        diagram="screws"
        {...{ direction, mount, channels, displayCategory }}
      >
        {stepOne}
      </InstructionStep>
      <InstructionStep
        step="two"
        diagram="tab"
        {...{ direction, mount, channels, displayCategory }}
      >
        {stepTwo}
      </InstructionStep>
    </div>
  )
}
