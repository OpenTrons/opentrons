import { formatPyList, formatPyStr, uuid } from '../../utils'
import type { CommandCreator } from '../../types'
import type { AbsorbanceReaderInitializeCreateCommand } from '@opentrons/shared-data'

export const absorbanceReaderInitialize: CommandCreator<
  AbsorbanceReaderInitializeCreateCommand['params']
> = (args, invariantContext, prevRobotState) => {
  const { moduleId, sampleWavelengths, measureMode, referenceWavelength } = args
  const pythonName = invariantContext.moduleEntities[moduleId].pythonName
  const referenceWavelengthPython =
    referenceWavelength != null
      ? `, reference_wavelength=${referenceWavelength}`
      : ''
  return {
    commands: [
      {
        commandType: 'absorbanceReader/initialize',
        key: uuid(),
        params: {
          moduleId,
          measureMode,
          sampleWavelengths,
          ...(referenceWavelength != null ? { referenceWavelength } : {}),
        },
      },
    ],
    python: `${pythonName}.initialize(${formatPyStr(
      measureMode
    )}, ${formatPyList(sampleWavelengths)}${referenceWavelengthPython})`,
  }
}
