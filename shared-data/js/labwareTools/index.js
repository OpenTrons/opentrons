// @flow
import Ajv from 'ajv'
import flatten from 'lodash/flatten'
import range from 'lodash/range'
import round from 'lodash/round'

import labwareSchema from '../../labware/schemas/2.json'
import {
  toWellName,
  sortWells,
  splitWellsOnColumn,
  getDisplayVolume,
  getAsciiVolumeUnits,
  ensureVolumeUnits,
} from '../helpers/index'

import type {
  LabwareDefinition2 as Definition,
  LabwareMetadata as Metadata,
  LabwareDimensions as Dimensions,
  LabwareBrand as Brand,
  LabwareParameters as Params,
  LabwareWell as Well,
  LabwareWellProperties as InputWell,
  LabwareWellMap as WellMap,
  LabwareWellGroup as WellGroup,
  LabwareOffset as Offset,
  LabwareVolumeUnits as VolumeUnits,
} from '../types'

// NOTE: leaving this 'beta' to reduce conflicts with future labware cloud namespaces
const DEFAULT_CUSTOM_NAMESPACE = 'custom_beta'
const SCHEMA_VERSION = 2

type Cell = {
  row: number,
  column: number,
}

// This represents creating a "range" of well names with step intervals included
// For example, starting at well "A1" with a column stride of 2 would result in
// the grid name being ordered as: "A1", "B1"..."A3", "B3"..etc
type GridStart = {
  rowStart: string,
  colStart: string,
  rowStride: number,
  colStride: number,
}

type InputParams = $Rest<Params, {| loadName: string |}>

export type RegularLabwareProps = {
  metadata: Metadata,
  parameters: InputParams,
  offset: Offset,
  dimensions: Dimensions,
  grid: Cell,
  spacing: Cell,
  well: InputWell,
  brand?: Brand,
  version?: number,
  namespace?: string,
}

export type IrregularLabwareProps = {
  metadata: Metadata,
  parameters: $Diff<Params, { loadName: string }>,
  offset: Array<Offset>,
  dimensions: Dimensions,
  grid: Array<Cell>,
  spacing: Array<Cell>,
  well: Array<InputWell>,
  gridStart: Array<GridStart>,
  brand?: Brand,
  version?: number,
  namespace?: string,
}

const ajv = new Ajv({ allErrors: true, jsonPointers: true })
const validate = ajv.compile(labwareSchema)

function validateDefinition(definition: Definition): Definition {
  const valid = validate(definition)

  if (!valid) {
    throw new Error(
      'Labware failed to validate against the schema:\n\n' +
        JSON.stringify(validate.errors, null, 4)
    )
  }

  return definition
}

export function _irregularWellName(
  rowIdx: number,
  colIdx: number,
  gridStart: GridStart
): string {
  const rowNum =
    rowIdx * gridStart.rowStride + gridStart.rowStart.charCodeAt(0) - 65
  const colNum = colIdx * gridStart.colStride + parseInt(gridStart.colStart) - 1
  return toWellName({ rowNum, colNum })
}

export function _calculateWellCoord(
  rowIdx: number,
  colIdx: number,
  spacing: Cell,
  offset: Offset,
  well: InputWell
): Well {
  const coords = {
    x: round(colIdx * spacing.column + offset.x, 2),
    y: round(rowIdx * spacing.row + offset.y, 2),
    z: round(offset.z - well.depth, 2),
  }
  // NOTE: Ian 2019-04-16 this silly "if circular" is to make Flow happy
  if (well.shape === 'circular') return { ...well, ...coords }
  return {
    ...well,
    ...coords,
  }
}

function determineIrregularLayout(
  grids: Array<Cell>,
  spacing: Array<Cell>,
  offset: Array<Offset>,
  gridStart: Array<GridStart>,
  wells: Array<InputWell>
): { wells: WellMap, groups: Array<WellGroup> } {
  return grids.reduce(
    (result, gridObj, gridIdx) => {
      const reverseRowIdx = range(gridObj.row - 1, -1)
      const currentGroup = { wells: [], metadata: {} }

      range(gridObj.column).forEach(colIdx => {
        range(gridObj.row).forEach(rowIdx => {
          const wellName = _irregularWellName(
            rowIdx,
            colIdx,
            gridStart[gridIdx]
          )
          currentGroup.wells.push(wellName)
          result.wells[wellName] = _calculateWellCoord(
            reverseRowIdx[rowIdx],
            colIdx,
            spacing[gridIdx],
            offset[gridIdx],
            wells[gridIdx]
          )
        })
      })

      return { wells: result.wells, groups: [...result.groups, currentGroup] }
    },
    { wells: {}, groups: [] }
  )
}

export function _generateIrregularLoadName(args: {
  grid: Array<Cell>,
  well: Array<InputWell>,
  totalWellCount: number,
  units: VolumeUnits,
  brand: string,
  displayCategory: string,
}): string {
  const { grid, well, totalWellCount, units, brand, displayCategory } = args
  const loadNameUnits = getAsciiVolumeUnits(units)
  const wellComboArray = grid.map((gridObj, gridIdx) => {
    const numWells = gridObj.row * gridObj.column
    const wellVolume = getDisplayVolume(well[gridIdx].totalLiquidVolume, units)

    return `${numWells}x${wellVolume}${loadNameUnits}`
  })

  return createName([brand, totalWellCount, displayCategory, wellComboArray])
}

// Decide order of wells for single grid containers
function determineOrdering(grid: Cell): Array<Array<string>> {
  const ordering = range(grid.column).map(colNum =>
    range(grid.row).map(rowNum => toWellName({ rowNum, colNum }))
  )

  return ordering
}

// Decide order of wells for multi-grid containers
export function determineIrregularOrdering(
  wellsArray: Array<string>
): Array<Array<string>> {
  const sortedArray = wellsArray.sort(sortWells)
  const ordering = splitWellsOnColumn(sortedArray)

  return ordering
}

// Private helper functione to calculate the XYZ coordinates of a give well
// Will return a nested object of all well objects for a labware
function calculateCoordinates(
  well: InputWell,
  ordering: Array<Array<string>>,
  spacing: Cell,
  offset: Offset
): WellMap {
  // Note, reverse() on its own mutates ordering. Use slice() as a workaround
  // to prevent mutation
  return ordering.reduce((wells, column, cIndex) => {
    column
      .slice()
      .reverse()
      .forEach((element, rIndex) => {
        wells[element] = {
          ...well,
          x: round(cIndex * spacing.column + offset.x, 2),
          y: round(rIndex * spacing.row + offset.y, 2),
          z: round(offset.z - well.depth, 2),
        }
      })
    return wells
  }, {})
}

function ensureBrand(brand?: Brand): Brand {
  return brand || { brand: 'generic' }
}

// joins the input array with _ to create a name, making sure to lowercase the
// result and remove all invalid characters (allowed characters: [a-z0-9_.])
function createName(
  fragments: Array<string | number | Array<string | number>>
): string {
  return flatten(fragments)
    .join('_')
    .toLowerCase()
    .replace(/[^a-z0-9_.]/g, '')
}

// Generator function for labware definitions within a regular grid format
// e.g. well plates, regular tuberacks (NOT 15_50ml) etc.
// For further info on these parameters look at labware examples in __tests__
// or the labware definition schema in labware/schemas/
export function createRegularLabware(args: RegularLabwareProps): Definition {
  const { offset, dimensions, grid, spacing, well } = args
  const version = args.version || 1
  const namespace = args.namespace || DEFAULT_CUSTOM_NAMESPACE
  const ordering = determineOrdering(grid)
  const numWells = grid.row * grid.column
  const brand = ensureBrand(args.brand)
  const metadata = {
    ...args.metadata,
    displayVolumeUnits: ensureVolumeUnits(args.metadata.displayVolumeUnits),
  }

  const loadName = createName([
    brand.brand,
    numWells,
    metadata.displayCategory,
    `${getDisplayVolume(
      well.totalLiquidVolume,
      metadata.displayVolumeUnits
    )}${getAsciiVolumeUnits(metadata.displayVolumeUnits)}`,
  ])

  return validateDefinition({
    ordering,
    brand,
    metadata,
    dimensions,
    wells: calculateCoordinates(well, ordering, spacing, offset),
    groups: [{ wells: flatten(ordering), metadata: {} }],
    parameters: { ...args.parameters, loadName },
    namespace,
    version,
    schemaVersion: SCHEMA_VERSION,
    cornerOffsetFromSlot: { x: 0, y: 0, z: 0 },
  })
}

// Generator function for labware definitions within an irregular grid format
// e.g. crystalization plates, 15_50ml tuberacks and anything with multiple "grids"
export function createIrregularLabware(
  args: IrregularLabwareProps
): Definition {
  const { offset, dimensions, grid, spacing, well, gridStart } = args
  const namespace = args.namespace || DEFAULT_CUSTOM_NAMESPACE
  const version = args.version || 1
  const { wells, groups } = determineIrregularLayout(
    grid,
    spacing,
    offset,
    gridStart,
    well
  )
  const brand = ensureBrand(args.brand)
  const metadata = {
    ...args.metadata,
    displayVolumeUnits: ensureVolumeUnits(args.metadata.displayVolumeUnits),
  }

  const loadName = _generateIrregularLoadName({
    grid,
    well,
    totalWellCount: Object.keys(wells).length,
    units: metadata.displayVolumeUnits,
    displayCategory: metadata.displayCategory,
    brand: brand.brand,
  })

  return validateDefinition({
    wells,
    groups,
    brand,
    metadata,
    dimensions,
    parameters: { ...args.parameters, loadName, format: 'irregular' },
    ordering: determineIrregularOrdering(Object.keys(wells)),
    namespace,
    version,
    schemaVersion: SCHEMA_VERSION,
    cornerOffsetFromSlot: { x: 0, y: 0, z: 0 },
  })
}
