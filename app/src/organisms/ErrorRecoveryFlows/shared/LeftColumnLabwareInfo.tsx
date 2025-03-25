import { InterventionContent } from '/app/molecules/InterventionModal/InterventionContent'

import type { ComponentProps } from 'react'
import type { RecoveryContentProps } from '../types'
import { RECOVERY_MAP } from '../constants'

type LeftColumnLabwareInfoProps = RecoveryContentProps & {
  title: string
  type: ComponentProps<typeof InterventionContent>['infoProps']['type']
  layout: ComponentProps<typeof InterventionContent>['infoProps']['layout']
  /* Renders a warning InlineNotification if provided. */
  bannerText?: string
}
// TODO(jh, 06-12-24): EXEC-500 & EXEC-501.
// The left column component adjacent to RecoveryDeckMap/TipSelection.
export function LeftColumnLabwareInfo({
  title,
  failedLabwareUtils,
  type,
  layout,
  bannerText,
  recoveryMap,
}: LeftColumnLabwareInfoProps): JSX.Element | null {
  const {
    failedLabwareName,
    failedLabwareNickname,
    failedLabwareLocations,
    labwareQuantity,
  } = failedLabwareUtils
  const { displayNameNewLoc, displayNameCurrentLoc } = failedLabwareLocations
  const { step } = recoveryMap
  const {
    MANUAL_REPLACE_STACKER_AND_RETRY,
    MANUAL_LOAD_IN_STACKER_AND_SKIP,
  } = RECOVERY_MAP

  const buildNewLocation = (): ComponentProps<
    typeof InterventionContent
  >['infoProps']['newLocationProps'] =>
    displayNameNewLoc != null
      ? { deckLabel: displayNameNewLoc.toUpperCase() }
      : undefined

  const buildCurrentLocation = (): ComponentProps<
    typeof InterventionContent
  >['infoProps']['currentLocationProps'] => {
    switch (step) {
      case MANUAL_REPLACE_STACKER_AND_RETRY.STEPS.CONFIRM_RETRY:
      case MANUAL_LOAD_IN_STACKER_AND_SKIP.STEPS.CONFIRM_RETRY:
        return {
          deckLabel: displayNameCurrentLoc.toUpperCase(),
        }
      case MANUAL_LOAD_IN_STACKER_AND_SKIP.STEPS.MANUAL_REPLACE:
        return {
          deckLabel: displayNameNewLoc?.toUpperCase() ?? '',
        }
      default:
        return {
          deckLabel: displayNameCurrentLoc.toUpperCase(),
        }
    }
  }

  const buildQuntity = (): string | null => {
    switch (step) {
      case MANUAL_REPLACE_STACKER_AND_RETRY.STEPS.CONFIRM_RETRY:
      case MANUAL_LOAD_IN_STACKER_AND_SKIP.STEPS.CONFIRM_RETRY:
        return labwareQuantity
      case MANUAL_LOAD_IN_STACKER_AND_SKIP.STEPS.MANUAL_REPLACE:
        return null
      default:
        return labwareQuantity
    }
  }

  return (
    <InterventionContent
      headline={title}
      infoProps={{
        layout: layout,
        tagText: buildQuntity(),
        subText: null, // where do we get the lid data from?
        type,
        labwareName: failedLabwareName ?? '',
        labwareNickname: failedLabwareNickname ?? '',
        currentLocationProps: buildCurrentLocation(),
        newLocationProps: buildNewLocation(),
      }}
      notificationProps={
        bannerText ? { type: 'alert', heading: bannerText } : undefined
      }
    />
  )
}
