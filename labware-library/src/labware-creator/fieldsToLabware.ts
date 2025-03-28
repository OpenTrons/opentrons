import { createRegularLabware, getModuleDef2 } from '@opentrons/shared-data'

import { DISPLAY_VOLUME_UNITS } from './fields'
import { getIsCustomTubeRack } from './utils'

import type { ProcessedLabwareFields } from './fields'
import type {
  LabwareWellGroup,
  //   createIrregularLabware,
  LabwareDefinition2,
  LabwareDisplayCategory,
  LabwareWellProperties,
  LabwareOffset,
  ModuleModel,
} from '@opentrons/shared-data'

// TODO Ian 2019-07-29: move this constant to shared-data?
// This is the distance from channel 1 to channel 8 of any 8-channel, not tied to name/model
export const MULTI_CHANNEL_WIDTH_MM = 64

export const _getGroupMetadataDisplayCategory = (args: {
  aluminumBlockChildType: string | null | undefined
  labwareType: string
}): LabwareDisplayCategory | null => {
  const { aluminumBlockChildType, labwareType } = args
  if (labwareType === 'tubeRack') {
    return 'tubeRack'
  } else if (labwareType === 'aluminumBlock') {
    const childIsWellPlate = aluminumBlockChildType === 'pcrPlate'
    return childIsWellPlate ? 'wellPlate' : 'tubeRack'
  }
  return null
}

export function fieldsToLabware(
  fields: ProcessedLabwareFields,
  adapterDefinitions?: LabwareDefinition2[]
): LabwareDefinition2 {
  // NOTE Ian 2019-07-27: only the 15-50-esque tube rack has multiple grids,
  // and it is not supported in labware creator. So all are regular.
  const isRegularLabware = true
  const { displayName, compatibleAdapters, compatibleModules } = fields
  const displayCategory = fields.labwareType
  if (isRegularLabware) {
    const totalLiquidVolume = fields.wellVolume
    const commonWellProperties = {
      depth: fields.wellDepth,
      totalLiquidVolume,
    }
    const wellProperties: LabwareWellProperties =
      fields.wellShape === 'circular'
        ? {
            ...commonWellProperties,
            shape: 'circular',
            diameter: fields.wellDiameter,
          }
        : {
            ...commonWellProperties,
            shape: 'rectangular',
            xDimension: fields.wellXDimension,
            yDimension: fields.wellYDimension,
          }

    // NOTE Ian 2019-07-29: Cannot use fields.labwareType, must be "96Standard", "384Standard", "trough", "irregular", or "trash".
    // Also note that 'irregular' in `format` just means "not 96/384 standard, not trough, and not trash",
    // it doesn't imply anything about having multiple grids or not.
    const format = 'irregular'
    let quirks: string[] = []

    const heightOrDiameter =
      fields.wellShape === 'circular'
        ? fields.wellDiameter
        : fields.wellYDimension
    if (fields.gridRows === 1 && heightOrDiameter >= MULTI_CHANNEL_WIDTH_MM) {
      quirks = [...quirks, 'centerMultichannelOnWells', 'touchTipDisabled']

      // Legacy API (v1) uses `lw_format == 'trough'` instead of centerMultichannelOnWells quirk.
      // HOWEVER, setting format to 'trough' also makes the well size zero, so you can't
      // position the tip to the edges of the labware.
      // Optimizing for the APIv1 labware test protocol (which is always with a single-channel)
      // over APIv1 protocol use, we'll AVOID setting the format to 'trough' here
      //
      // format = 'trough' // Uncomment to break test protocol but allow multichannel use in APIv1
    }

    const brand = {
      brand: fields.brand,
      brandId: fields.brandId,
      //   links: []
    }

    let groupBrand: LabwareWellGroup['brand'] | null = null

    if (getIsCustomTubeRack(fields)) {
      groupBrand = {
        brand: fields.groupBrand,
        brandId: fields.groupBrandId,
      }
    }

    const groupMetadataDisplayCategory = _getGroupMetadataDisplayCategory({
      aluminumBlockChildType: fields.aluminumBlockChildType,
      labwareType: fields.labwareType,
    })

    const isTiprack = fields.labwareType === 'tipRack'

    const stackingOffsetWithLabware: Record<string, LabwareOffset> = {}
    Object.entries(compatibleAdapters).forEach(([loadName, z]) => {
      const adapterHeight =
        adapterDefinitions != null
          ? Object.values(adapterDefinitions).find(
              definition => definition.parameters.loadName === loadName
            )?.dimensions.zDimension ?? 0
          : 0
      return (stackingOffsetWithLabware[loadName] = {
        x: 0,
        y: 0,
        //  ensure that z is a number!
        z: fields.labwareZDimension + adapterHeight - parseFloat(String(z)),
      })
    })
    const stackingOffsetWithModule: Record<string, LabwareOffset> = {}
    Object.entries(compatibleModules).forEach(([moduleModel, z]) => {
      const moduleDefinition = getModuleDef2(moduleModel as ModuleModel)
      return (stackingOffsetWithModule[moduleModel] = {
        x: 0,
        y: 0,
        //  ensure that z is a number!
        z:
          fields.labwareZDimension -
          parseFloat(String(z)) +
          moduleDefinition.labwareOffset.z,
      })
    })

    const def = createRegularLabware({
      strict: false,
      metadata: {
        displayName,
        displayCategory,
        displayVolumeUnits: DISPLAY_VOLUME_UNITS,
        tags: [], // specifying tags is not yet supported
      },
      parameters: {
        format,
        quirks,
        isTiprack,
        // NOTE: `wellDepth` field is used to represent tip length for tip racks
        ...(isTiprack ? { tipLength: fields.wellDepth } : {}),
        // Currently, assume labware is not magnetic module compatible. We don't have the information here.
        isMagneticModuleCompatible: false,
        //   magneticModuleEngageHeight?: number,
      },
      dimensions: {
        xDimension: fields.footprintXDimension,
        yDimension: fields.footprintYDimension,
        zDimension: fields.labwareZDimension,
      },
      brand,
      version: 1,
      offset: {
        x: fields.gridOffsetX,
        y: fields.gridOffsetY,
        // NOTE: must give wells a z offset b/c `well.z = offset.z - wellDepth`.
        // We include well lip as part of Z dimension in Labware Creator's fields,
        // so labware's offset.z is the SAME as labwareZDimension.
        z: fields.labwareZDimension,
      },
      grid: {
        column: fields.gridColumns,
        row: fields.gridRows,
      },
      spacing: {
        column: fields.gridSpacingX,
        row: fields.gridSpacingY,
      },
      well: wellProperties,
      // NOTE(IL, 2020-06-22): as per #5801, `group` should not include brand or displayName
      // unless the "wells" are different than the overall labware (eg NEST tubes in an opentrons rack/block).
      // Since LC doesn't allow the user to specify any of these 3 fields for wells themselves, we'll omit them
      // from the definition.
      group: {
        ...(groupBrand === null ? {} : { brand: groupBrand }),
        metadata: {
          ...(fields.wellBottomShape === null
            ? null
            : { wellBottomShape: fields.wellBottomShape }),
          ...(groupMetadataDisplayCategory === null
            ? null
            : { displayCategory: groupMetadataDisplayCategory }),
        },
      },
      stackingOffsetWithLabware:
        Object.keys(stackingOffsetWithLabware).length > 0
          ? stackingOffsetWithLabware
          : undefined,
      stackingOffsetWithModule:
        Object.keys(stackingOffsetWithModule).length > 0
          ? stackingOffsetWithModule
          : undefined,
    })

    // overwrite loadName from createRegularLabware with ours
    def.parameters.loadName = fields.loadName

    return def
  } else {
    throw new Error('use of createIrregularLabware not yet implemented')
    // return createIrregularLabware({ TODO })
  }
}
