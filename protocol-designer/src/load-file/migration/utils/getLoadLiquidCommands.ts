import reduce from 'lodash/reduce'
import { uuid } from '../../../utils'
import type { LoadLiquidCreateCommand } from '@opentrons/shared-data/protocol/types/schemaV6/command/setup'

export interface DesignerApplicationData {
  ingredients: Record<
    string,
    {
      name: string | null | undefined
      description: string | null | undefined
      serialize: boolean
    }
  >
  ingredLocations: {
    [labwareId: string]: {
      [wellName: string]: { [liquidId: string]: { volume: number } }
    }
  }
}

export const getLoadLiquidCommands = (
  ingredients?: DesignerApplicationData['ingredients'],
  ingredLocations?: DesignerApplicationData['ingredLocations']
): LoadLiquidCreateCommand[] => {
  let loadLiquidCommands: LoadLiquidCreateCommand[] = []

  let labwareIdsByLiquidId: { [liquidId: string]: string[] } = {}

  if (ingredLocations != null && ingredients != null) {
    Object.keys(ingredients).forEach(liquidId => {
      if (ingredLocations != null) {
        for (const [labwareId, liquidsByWellName] of Object.entries(
          ingredLocations
        )) {
          Object.values(liquidsByWellName).forEach(volumeByLiquidId => {
            if (liquidId in volumeByLiquidId) {
              if (labwareIdsByLiquidId[liquidId] == null) {
                labwareIdsByLiquidId = {
                  ...labwareIdsByLiquidId,
                  [liquidId]: [labwareId],
                }
              } else if (!labwareIdsByLiquidId[liquidId].includes(labwareId)) {
                labwareIdsByLiquidId = {
                  ...labwareIdsByLiquidId,
                  [liquidId]: [...labwareIdsByLiquidId[liquidId], labwareId],
                }
              }
            }
          })
        }
      }
    })

    loadLiquidCommands = reduce<
      { [liquidId: string]: string[] },
      LoadLiquidCreateCommand[]
    >(
      labwareIdsByLiquidId,
      (acc, labwareIds, liquidId) => {
        const commands: LoadLiquidCreateCommand[] = labwareIds.map(
          labwareId => {
            const volumeByWell = reduce(
              ingredLocations[labwareId],
              (acc, volumesByLiquidId, wellName) => {
                if (liquidId in volumesByLiquidId) {
                  return {
                    ...acc,
                    [wellName]: volumesByLiquidId[liquidId].volume,
                  }
                } else {
                  return { ...acc }
                }
              },
              {}
            )

            const loadLiquidCommand: LoadLiquidCreateCommand = {
              commandType: 'loadLiquid',
              key: uuid(),
              params: {
                liquidId,
                labwareId,
                volumeByWell,
              },
            }
            return loadLiquidCommand
          }
        )
        return [...commands, ...acc]
      },
      []
    )
  }
  return loadLiquidCommands
}
