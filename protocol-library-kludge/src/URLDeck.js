// @flow
import React, { Fragment, type Node } from 'react'
import styles from './URLDeck.css'

import {
  RobotWorkSpace,
  Labware as LegacyLabwareRender,
  LabwareNameOverlay,
  LabwareRender,
  Module,
  RobotCoordsForeignDiv,
} from '@opentrons/components'
import { getLatestLabwareDef, getLegacyLabwareDef } from './getLabware'
import { getDeckDefinitions } from '@opentrons/components/src/deck/getDeckDefinitions'
import type { ModuleModel, DeckSlotId } from '@opentrons/shared-data'

// URI-encoded JSON expected as URL param "data" (eg `?data=...`)
type UrlData = {
  labware: {
    [DeckSlotId]: {
      labwareType: string,
      name: ?string,
    },
  },
  modules: {
    [DeckSlotId]: ModuleModel,
  },
}

const DECK_DEF = getDeckDefinitions()['ot2_standard']

const DECK_LAYER_BLACKLIST = [
  'calibrationMarkings',
  'fixedBase',
  'doorStops',
  'metalFrame',
  'removalHandle',
  'removableDeckOutline',
  'screwHoles',
]

function getDataFromUrl(): ?UrlData {
  try {
    const urlData = new URLSearchParams(window.location.search).get('data')

    if (!urlData) {
      console.error('No "data" param in URL')
      return null
    }

    return JSON.parse(urlData)
  } catch (e) {
    console.error('Failed to parse "data" URL param.', e)
    return null
  }
}

export class URLDeck extends React.Component<{||}> {
  urlData: ?UrlData

  constructor() {
    super()
    this.urlData = getDataFromUrl()
  }

  render() {
    const labwareBySlot = this.urlData?.labware
    const modulesBySlot = this.urlData?.modules

    return (
      <RobotWorkSpace
        deckDef={DECK_DEF}
        deckLayerBlacklist={DECK_LAYER_BLACKLIST}
        viewBox={`-35 -35 ${488} ${390}`} // TODO: put these in variables
        className={styles.url_deck}
      >
        {({ deckSlotsById }): Array<Node> =>
          Object.keys(deckSlotsById).map((slotId): Node => {
            const slot = deckSlotsById[slotId]
            if (!slot.matingSurfaceUnitVector) return null // if slot has no mating surface, don't render anything in it
            const moduleModel = modulesBySlot && modulesBySlot[slotId]
            const labware = labwareBySlot && labwareBySlot[slotId]
            const labwareDefV2 =
              labware && getLatestLabwareDef(labware.labwareType)
            const labwareDefV1 =
              labwareDefV2 || !labware
                ? null
                : getLegacyLabwareDef(labware.labwareType)
            let labwareDisplayType: string | null = null
            if (labwareDefV2) {
              labwareDisplayType = labwareDefV2.metadata.displayName
            } else if (labwareDefV1) {
              labwareDisplayType =
                labwareDefV1.metadata.displayName || labwareDefV1.metadata.name
            } else {
              labwareDisplayType = labware?.labwareType || null
            }

            return (
              <Fragment key={slotId}>
                {moduleModel && (
                  <g
                    transform={`translate(${slot.position[0]}, ${
                      slot.position[1]
                    })`}
                  >
                    <Module model={moduleModel} mode={'default'} />
                  </g>
                )}
                {labware && (
                  <g
                    transform={`translate(${slot.position[0]}, ${
                      slot.position[1]
                    })`}
                  >
                    {labwareDefV2 ? (
                      <LabwareRender definition={labwareDefV2} />
                    ) : (
                      <LegacyLabwareRender
                        x={0}
                        y={0}
                        definition={labwareDefV1}
                      />
                    )}
                  </g>
                )}
                {labware && (
                  <RobotCoordsForeignDiv
                    x={slot.position[0]}
                    y={slot.position[1]}
                    width={slot.boundingBox.xDimension}
                    height={slot.boundingBox.yDimension}
                  >
                    <LabwareNameOverlay
                      className={styles.labware_name_overlay}
                      title={labware.name || labwareDisplayType || ''}
                      subtitle={labware.name ? labwareDisplayType : null}
                    />
                  </RobotCoordsForeignDiv>
                )}
              </Fragment>
            )
          })
        }
      </RobotWorkSpace>
    )
  }
}
