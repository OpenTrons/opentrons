// @flow
import isEqual from 'lodash/isEqual'
import uniqWith from 'lodash/uniqWith'
import round from 'lodash/round'
import sortedUniq from 'lodash/sortedUniq'
import uniq from 'lodash/uniq'
import type {
  LabwareWell,
  LabwareWellShapeProperties,
  LabwareWellGroupProperties,
  LabwareDefinition,
} from './types'

export function getUniqueWellProperties(
  definition: LabwareDefinition
): Array<LabwareWellGroupProperties> {
  const { groups, wells, dimensions } = definition

  return groups.map(group => {
    const wellProps = group.wells.map(n => wells[n])

    const wellDepths = wellProps.map<number>(w => w.depth)
    const wellVolumes = wellProps.map<number>(w => w.totalLiquidVolume)
    const wellShapes = wellProps.map<LabwareWellShapeProperties>(
      (well: LabwareWell) =>
        well.shape === 'circular'
          ? { shape: well.shape, diameter: well.diameter }
          : {
              shape: well.shape,
              xDimension: well.xDimension,
              yDimension: well.yDimension,
            }
    )

    const xStart = wellProps[0].x
    const yStart = wellProps[0].y

    return {
      metadata: group.metadata,
      brand: group.brand || null,
      xSpacing: getSpacingIfUniform(wellProps, 'x'),
      ySpacing: getSpacingIfUniform(wellProps, 'y'),
      xOffsetFromLeft: xStart,
      yOffsetFromTop: dimensions.yDimension - yStart,
      wellCount: wellProps.length,
      depth: getIfConsistent(wellDepths),
      totalLiquidVolume: getIfConsistent(wellVolumes),
      shape: getIfConsistent(wellShapes),
    }
  })
}

export function getIfConsistent<T>(items: Array<T>): T | null {
  return uniqWith(items, isEqual).length === 1 ? items[0] : null
}

const SPACING_PRECISION = 2
export function getSpacingIfUniform(
  wells: Array<LabwareWell>,
  axis: 'x' | 'y'
): number | null {
  const wellPositions = sortedUniq(uniq(wells.map(well => well[axis])))
  if (wellPositions.length < 2) return null

  const initialSpacing = round(
    wellPositions[1] - wellPositions[0],
    SPACING_PRECISION
  )

  if (initialSpacing === 0) return null

  for (var i = 2; i < wellPositions.length; i++) {
    const pos = wellPositions[i]
    const prevWellPos = wellPositions[i - 1]
    const spacing = round(pos - prevWellPos, SPACING_PRECISION)
    if (spacing !== initialSpacing) return null
  }

  return Math.abs(initialSpacing)
}
