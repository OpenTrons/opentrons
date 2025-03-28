import {
  ABSORBANCE_READER_INITIALIZE,
  ABSORBANCE_READER_LID,
  ABSORBANCE_READER_READ,
} from '../../../constants'
import type { AbsorbanceReaderArgs } from '@opentrons/step-generation'
import type { HydratedAbsorbanceReaderFormData } from '../../../form-types'

export const absorbanceReaderFormToArgs = (
  hydratedFormData: HydratedAbsorbanceReaderFormData
): AbsorbanceReaderArgs | null => {
  const {
    absorbanceReaderFormType,
    fileName,
    lidOpen,
    moduleId,
    mode,
    referenceWavelength,
    referenceWavelengthActive,
    wavelengths,
    stepDetails,
    stepName,
  } = hydratedFormData

  const baseValues = { description: stepDetails, name: stepName }
  const lidAction = lidOpen
    ? 'absorbanceReaderOpenLid'
    : 'absorbanceReaderCloseLid'
  switch (absorbanceReaderFormType) {
    case ABSORBANCE_READER_INITIALIZE:
      const rawWavelengths =
        (mode === 'single' ? [wavelengths[0]] : wavelengths) ?? // only take first wavelength in single mode
        []
      return {
        moduleId,
        commandCreatorFnName: 'absorbanceReaderInitialize',
        measureMode: mode,
        sampleWavelengths: rawWavelengths?.map(wavelength =>
          parseFloat(wavelength)
        ),
        ...(mode === 'single' &&
        referenceWavelengthActive &&
        referenceWavelength != null
          ? { referenceWavelength: parseFloat(referenceWavelength) }
          : {}),
        ...baseValues,
      }
    case ABSORBANCE_READER_READ:
      return {
        moduleId,
        commandCreatorFnName: 'absorbanceReaderRead',
        fileName: fileName ?? null,
        ...baseValues,
      }
    case ABSORBANCE_READER_LID:
      return {
        moduleId,
        commandCreatorFnName: lidAction,
        ...baseValues,
      }
    default:
      return null
  }
}
