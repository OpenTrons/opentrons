import { FLEX_STACKER_MODULE_TYPE, getModuleType } from '@opentrons/shared-data'
import {
  DeckInfoLabel,
  MODULE_ICON_NAME_BY_TYPE,
  Flex,
} from '@opentrons/components'

import type { LocationSpecificOffsetDetails } from '/app/redux/protocol-runs'

export interface LabwareOffsetsDeckInfoLabelsProps {
  detail: LocationSpecificOffsetDetails
  slotCopy: string
}

export function LabwareOffsetsDeckInfoLabels({
  detail,
  slotCopy,
}: LabwareOffsetsDeckInfoLabelsProps): JSX.Element {
  const {
    closestBeneathModuleModel,
    lwModOnlyStackupDetails,
  } = detail.locationDetails

  const isLabwareInLwStackup = (): boolean => {
    const lwOnlyStackup = lwModOnlyStackupDetails.filter(
      component => component.kind === 'labware'
    )

    return lwOnlyStackup.length > 1
  }

  return (
    <Flex>
      <DeckInfoLabel deckLabel={slotCopy} />
      {isLabwareInLwStackup() && (
        <DeckInfoLabel
          iconName={MODULE_ICON_NAME_BY_TYPE[FLEX_STACKER_MODULE_TYPE]}
          key="stacked-icon"
        />
      )}
      {closestBeneathModuleModel != null && (
        <DeckInfoLabel
          iconName={
            MODULE_ICON_NAME_BY_TYPE[getModuleType(closestBeneathModuleModel)]
          }
          key="module-icon"
        />
      )}
    </Flex>
  )
}
