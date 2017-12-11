import React from 'react'
import cx from 'classnames'
import styles from './LabwareContainer.css'
import { nonFillableContainers } from '../constants.js'
import { humanize } from '../utils.js'

import SelectablePlate from '../containers/SelectablePlate.js'

// import CopyIcon from '../svg/CopyIcon.js' // TODO bring back icon
import NameThisLabwareOverlay from '../components/NameThisLabwareOverlay.js'

// On an empty slot:
// * Renders a slot on the deck
// * Renders Add Labware mouseover button
//
// On a slot with a container:
// * Renders a SelectablePlate in the slot
// * Renders Add Ingreds / Delete container mouseover buttons, and dispatches their actions

// TODO: factor CenteredTextSvg out...??? is there a better way? Can't use CSS for x / y / text-anchor.
function CenteredTextSvg ({text, className}) {
  return (
    <text x='50%' y='50%' textAnchor='middle' {...{className}}>
      {text}
    </text>
  )
}

function OccupiedDeckSlotOverlay ({
  canAddIngreds,
  containerId,
  slotName,
  containerType,
  containerName,
  openIngredientSelector,
  setCopyLabwareMode,
  deleteContainer
}) {
  return (
    <g className={cx(styles.slot_overlay, styles.appear_on_mouseover)}>
      {/* Overlay Background */}
      <rect x='0' y='0' className={styles.slot_overlay} />
      {canAddIngreds && // TODO add back canAddIngreds conditional
        <text x='0' y='25%' className={styles.clickable}
          onClick={() => openIngredientSelector({containerId, slotName, containerType})}
          >
            Add Ingredients
          </text>
      }

      <text x='0' y='50%' className={styles.clickable}
        onClick={() => setCopyLabwareMode(containerId)}>Copy Labware</text>

      <text x='0' y='75%' className={styles.clickable}
        onClick={() =>
            window.confirm(`Are you sure you want to permanently delete ${containerName} in slot ${slotName}?`) &&
            deleteContainer({containerId, slotName, containerType})
        }
      >
        Remove {containerName}
      </text>
    </g>
  )
}

function SlotWithContainer ({containerType, containerName, containerId}) {
  // NOTE: Ian 2017-12-06 is this a good or bad idea for SVG layouts?
  const paddingLeft = 5
  const paddingTop = 0
  const boxHeight = 30
  return (
    <g>
      {nonFillableContainers.includes(containerType)
        ? <image // TODO do real styles and maybe get SVG landscape images
          href={`https://s3.amazonaws.com/opentrons-images/website/labware/${containerType}.png`}
          width='120' height='120'
          transform='translate(125 -15) rotate(90)'
        />
        : <SelectablePlate containerId={containerId} cssFillParent />
      }
      {containerName && <g className={styles.name_overlay}>
        <rect x='0' y='0' height={boxHeight} width='100%' fill='rgba(0,0,0,0.8)' /> {/* TODO don't inline fill? */}
        <text x={paddingLeft} y={0.4 * boxHeight + paddingTop}>
          {humanize(containerType)}
        </text>
        <text x={paddingLeft} y={0.9 * boxHeight + paddingTop} className={styles.container_name}>
          {containerName}
        </text>
      </g>}
    </g>
  )
}

export default function LabwareContainer ({
  slotName,

  containerId,
  containerType,
  containerName,

  canAdd,

  activeModals,
  openIngredientSelector,

  createContainer,
  deleteContainer,
  modifyContainer,

  openLabwareSelector,
  closeLabwareSelector,

  setCopyLabwareMode,
  labwareToCopy,
  copyLabware,

  height,
  width,
  highlighted
}) {
  const hasName = containerName !== null
  const slotIsOccupied = !!containerType

  const canAddIngreds = hasName && !nonFillableContainers.includes(containerType)

  const defs = {roundSlotClipPath: 'roundSlotClipPath'}

  return (
    <g>
      <svg {...{height, width}} className={styles.deck_slot}>
        {/* Defs for anything inside this SVG. TODO: how to better organize IDs and defined elements? */}
        <defs>
          <clipPath id={defs.roundSlotClipPath}>
            <rect rx='6' width='100%' height='100%' />
          </clipPath>
        </defs>

        {/* The actual deck slot container: rendering of container, or rendering of empty slot */}
        {slotIsOccupied
          ? <SlotWithContainer {...{containerType, containerName, containerId}} />
          // Empty slot
          : <g className={styles.empty_slot}>
            <rect width='100%' height='100%' />
            <CenteredTextSvg text={slotName} />
          </g>}

        {!slotIsOccupied && (activeModals.labwareSelection
          // "Add Labware" labware selection dropdown menu
          ? null /* (slotName === canAdd) && <LabwareDropdown
                onClose={e => closeLabwareSelector({slotName})}
                onContainerChoose={containerType => createContainer({slotName, containerType})}
              /> */
          : (labwareToCopy
              // Mouseover empty slot -- Add (or Copy if in copy mode)
              ? <g className={cx(styles.slot_overlay, styles.appear_on_mouseover)}>
                <rect className={styles.add_labware} onClick={() => copyLabware(slotName)} />
                <CenteredTextSvg className={styles.pass_thru_mouse} text='Place Copy' />
              </g>
              : <g className={cx(styles.slot_overlay, styles.appear_on_mouseover)}>
                <rect className={styles.add_labware} onClick={e => openLabwareSelector({slotName})} />
                <CenteredTextSvg className={styles.pass_thru_mouse} text='Add Labware' />
              </g>
          )
        )}

        {slotIsOccupied && hasName &&
          <OccupiedDeckSlotOverlay {...{
            canAddIngreds,
            containerId,
            slotName,
            containerType,
            containerName,
            openIngredientSelector,
            setCopyLabwareMode,
            deleteContainer
          }} />}

        {!hasName && <NameThisLabwareOverlay {...{
          containerType,
          containerId,
          slotName,
          modifyContainer,
          deleteContainer
        }} />}

      </svg>
      {/* Highlight border goes outside the SVG so it doesn't get clipped... */}
      {highlighted &&
        <rect className={styles.highlighted} x='0' y='0' width={width} height={height} rx='6' />}
    </g>
  )
}
