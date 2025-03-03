import { getUniqueWellProperties } from '@opentrons/shared-data'
import type {
  Vector3D,
  LabwareDefinition2,
  LabwareWellGroup,
} from '@opentrons/shared-data'
import type { LabwareFields, BooleanString } from './fields'

// NOTE: this is just String() with some typing for flow
const boolToBoolString = (b: boolean): BooleanString => (b ? 'true' : 'false')

export function labwareDefToFields(
  def: LabwareDefinition2,
  adapterDefinitions: LabwareDefinition2[]
): LabwareFields | null {
  const allUniqueWellGroupProps = getUniqueWellProperties(def)

  if (allUniqueWellGroupProps.length === 0) {
    console.warn(
      'cannot get unique well props for definition, maybe it has missing/incomplete "groups" data?',
      def
    )
    return null
  }

  const {
    xSpacing,
    ySpacing,
    shape,
    depth,
    metadata,
    totalLiquidVolume,
    xOffsetFromLeft,
    yOffsetFromTop,
  } = allUniqueWellGroupProps[0]

  const homogeneousWells =
    allUniqueWellGroupProps.length === 1 &&
    shape !== null &&
    depth !== null &&
    totalLiquidVolume !== null

  // TODO: Ian 2019-08-28 once LC supports multiple groupds, num of rows / num of columns should
  // come from getUniqueWellProperties. Using `ordering` won't extend to multiple groups
  const gridRowsNum = def.ordering[0].length
  const gridColumnsNum = def.ordering.length

  const regularColumnSpacing = xSpacing !== null
  const regularRowSpacing = ySpacing !== null

  let labwareType: LabwareFields['labwareType'] | null = null

  if (
    def.metadata.displayCategory === 'wellPlate' ||
    def.metadata.displayCategory === 'tubeRack' ||
    def.metadata.displayCategory === 'aluminumBlock' ||
    def.metadata.displayCategory === 'reservoir' ||
    def.metadata.displayCategory === 'tipRack'
  ) {
    labwareType = def.metadata.displayCategory
  }

  if (
    !homogeneousWells ||
    !regularRowSpacing ||
    !regularColumnSpacing ||
    labwareType === null ||
    !(shape !== null && depth !== null && totalLiquidVolume !== null)
  ) {
    console.warn(
      'this labware def is more heterogeneous than LC can currently support',
      {
        homogeneousWells,
        regularColumnSpacing,
        regularRowSpacing,
        labwareType,
        allUniqueWellGroupProps,
      }
    )
    return null
  }

  const firstGroup: LabwareWellGroup | undefined = def.groups[0]
  const firstGroupBrand = firstGroup?.brand
  const zDimension = def.dimensions.zDimension
  const compatibleAdapters: Record<string, number> =
    def.stackingOffsetWithLabware != null
      ? Object.entries(
          def.stackingOffsetWithLabware as Record<string, Vector3D>
        ).reduce<Record<string, number>>((acc, [loadName, offset]) => {
          const adapterZDimension = Object.values(adapterDefinitions).find(
            def => def.parameters.loadName === loadName
          )?.dimensions.zDimension
          if (adapterZDimension != null) {
            acc[loadName] = adapterZDimension + zDimension - offset.z
          }

          return acc
        }, {})
      : {}
  const compatibleModules: Record<string, number> =
    def.stackingOffsetWithModule != null
      ? Object.entries(
          def.stackingOffsetWithModule as Record<string, Vector3D>
        ).reduce<Record<string, number>>((acc, [moduleModel, offset]) => {
          acc[moduleModel] = zDimension - offset.z
          return acc
        }, {})
      : {}

  return {
    // NOTE: Ian 2019-08-26 these LC-specific fields cannot easily/reliably be inferred
    tubeRackInsertLoadName: null,
    aluminumBlockType: null,
    aluminumBlockChildType: null,

    // We assume all tipracks are snug upon import
    handPlacedTipFit: labwareType === 'tipRack' ? 'snug' : null,

    labwareType,
    footprintXDimension: String(def.dimensions.xDimension),
    footprintYDimension: String(def.dimensions.yDimension),
    labwareZDimension: String(def.dimensions.zDimension),

    // Missing values or zeroes for these fields should be translated to null
    gridRows: gridRowsNum > 0 ? String(gridRowsNum) : null,
    gridColumns: gridColumnsNum > 0 ? String(gridColumnsNum) : null,
    gridSpacingX: xSpacing == null || xSpacing === 0 ? null : String(xSpacing),
    gridSpacingY: ySpacing == null || ySpacing === 0 ? null : String(ySpacing),

    gridOffsetX: String(xOffsetFromLeft),
    gridOffsetY: String(yOffsetFromTop),

    homogeneousWells: boolToBoolString(homogeneousWells),
    regularRowSpacing: boolToBoolString(regularRowSpacing),
    regularColumnSpacing: boolToBoolString(regularColumnSpacing),

    wellVolume: String(totalLiquidVolume),
    wellBottomShape: metadata.wellBottomShape ?? null,
    wellDepth: String(depth),
    wellShape: shape.shape,

    // used with circular well shape only
    wellDiameter: shape.shape === 'circular' ? String(shape.diameter) : null,

    // used with rectangular well shape only
    wellXDimension:
      shape.shape === 'rectangular' ? String(shape.xDimension) : null,
    wellYDimension:
      shape.shape === 'rectangular' ? String(shape.yDimension) : null,

    brand: def.brand.brand,
    brandId: def.brand.brandId != null ? def.brand.brandId.join(',') : null, // comma-separated values
    groupBrand: firstGroupBrand?.brand,
    groupBrandId: firstGroupBrand?.brandId?.join(',') ?? undefined,

    // NOTE: intentionally null these fields, do not import them
    loadName: null,
    displayName: null,
    compatibleAdapters,
    compatibleModules,
  }
}
