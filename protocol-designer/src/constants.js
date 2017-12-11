import reduce from 'lodash/reduce'
import defaultContainers from './default-containers.json'

export { defaultContainers }

export const SLOTNAME_MATRIX = [ // used for deckmap
  ['10', '11', '12'],
  ['7', '8', '9'],
  ['4', '5', '6'],
  ['1', '2', '3']
]

export const sortedSlotnames = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']

// Slot dims in mm
export const SLOT_WIDTH = 127.8
export const SLOT_HEIGHT = 85.5
export const SLOT_SPACING = 5
export const DECK_WIDTH = SLOT_WIDTH * 3 + SLOT_SPACING * 4
export const DECK_HEIGHT = SLOT_HEIGHT * 4 + SLOT_SPACING * 5

// These 'nonfillable' container types render on the deck as an image instead of Wells
export const nonFillableContainers = [
  'trash-box',
  'tiprack-10ul',
  'tiprack-200ul',
  'tiprack-1000ul',
  'tiprack-1000ul-chem'
]

export const getMaxVolumes = containerType => {
  const cont = defaultContainers.containers[containerType]
  if (cont) {
    return reduce(
      cont.locations,
      (acc, wellData, wellName) => ({
        ...acc,
        [wellName]: wellData['total-liquid-volume']
      }),
      {}
    )
  }
  console.warn(`Container type ${containerType} not in default-containers.json, max vol defaults to 30000`)
  return {default: 300}
}

// The '.ot-selectable' classname is used to find collisions with SelectionRect
export const SELECTABLE_WELL_CLASS = 'ot-selectable-well'

// TODO factor into CSS or constants or elsewhere
export const swatchColors = n => {
  const colors = [
    '#e6194b',
    '#3cb44b',
    '#ffe119',
    '#0082c8',
    '#f58231',
    '#911eb4',
    '#46f0f0',
    '#f032e6',
    '#d2f53c',
    '#fabebe',
    '#008080',
    '#e6beff',
    '#aa6e28',
    '#fffac8',
    '#800000',
    '#aaffc3',
    '#808000',
    '#ffd8b1',
    '#000080',
    '#808080',
    '#000000'
  ]
  return colors[n % colors.length]
}
