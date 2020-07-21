// @flow
import * as React from 'react'
import map from 'lodash/map'
import { OutlineButton, RobotWorkSpace } from '@opentrons/components'
import { getDeckDefinitions } from '@opentrons/components/src/deck/getDeckDefinitions'

import * as Sessions from '../../sessions'
import { getLatestLabwareDef } from '../../getLabware'
import type { CalibrateTipLengthChildProps } from './types'
import { CalibrationLabwareRender } from './CalibrationLabwareRender'
import styles from './styles.css'

const DECK_SETUP_WITH_BLOCK_PROMPT =
  'Place full tip rack and Calibration Block on the deck within their designated slots as illustrated below.'
const DECK_SETUP_NO_BLOCK_PROMPT =
  'Place full tip rack on the deck within the designated slot as illustrated below.'
const DECK_SETUP_BUTTON_TEXT = 'Confirm placement and continue'

export function DeckSetup(props: CalibrateTipLengthChildProps): React.Node {
  const deckDef = React.useMemo(() => getDeckDefinitions()['ot2_standard'], [])

  const { hasBlock, labware, sendSessionCommand } = props

  const proceed = () => {
    sendSessionCommand(Sessions.tipCalCommands.MOVE_TO_REFERENCE_POINT)
  }

  return (
    <>
      <div className={styles.prompt}>
        {hasBlock ? (
          <p className={styles.prompt_text}>{DECK_SETUP_WITH_BLOCK_PROMPT}</p>
        ) : (
          <p className={styles.prompt_text}>{DECK_SETUP_NO_BLOCK_PROMPT}</p>
        )}
        <OutlineButton
          className={styles.prompt_button}
          onClick={proceed}
          inverted
        >
          {DECK_SETUP_BUTTON_TEXT}
        </OutlineButton>
      </div>
      <div className={styles.deck_map_wrapper}>
        <RobotWorkSpace
          deckLayerBlocklist={[
            'fixedBase',
            'doorStops',
            'metalFrame',
            'removalHandle',
            'removableDeckOutline',
            'screwHoles',
            'calibrationMarkings',
          ]}
          deckDef={deckDef}
          viewBox={`-46 -10 ${488} ${390}`} // TODO: put these in variables
          className={styles.deck_map}
        >
          {({ deckSlotsById }) =>
            map(
              deckSlotsById,
              (slot: $Values<typeof deckSlotsById>, slotId) => {
                if (!slot.matingSurfaceUnitVector) return null // if slot has no mating surface, don't render anything in it
                const labwareForSlot = labware.find(l => l.slot === slotId)
                const labwareDef = getLatestLabwareDef(labwareForSlot?.loadName)

                return labwareDef ? (
                  <CalibrationLabwareRender
                    key={slotId}
                    slotDef={slot}
                    labwareDef={labwareDef}
                  />
                ) : null
              }
            )
          }
        </RobotWorkSpace>
      </div>
    </>
  )
}
