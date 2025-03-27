import type { LPCLabwareInfo } from '/app/redux/protocol-runs'

export function clearAllWorkingOffsets(
  labware: LPCLabwareInfo['labware']
): LPCLabwareInfo['labware'] {
  const updatedLabware = { ...labware }

  Object.keys(updatedLabware).forEach(uri => {
    const lwGeometryDetails = { ...updatedLabware[uri] }

    // Clear the default offset's working offset.
    lwGeometryDetails.defaultOffsetDetails = {
      ...lwGeometryDetails.defaultOffsetDetails,
      workingOffset: null,
    }

    // Clear all location-specific offsets' working offsets.
    if (lwGeometryDetails.locationSpecificOffsetDetails.length > 0) {
      lwGeometryDetails.locationSpecificOffsetDetails = lwGeometryDetails.locationSpecificOffsetDetails.map(
        locationSpecificOffset => ({
          ...locationSpecificOffset,
          workingOffset: null,
        })
      )
    }

    updatedLabware[uri] = lwGeometryDetails
  })

  return updatedLabware
}
