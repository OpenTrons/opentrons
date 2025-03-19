import { css } from 'styled-components'
import { useSelector } from 'react-redux'

import {
  ALIGN_FLEX_START,
  BaseDeck,
  Flex,
  JUSTIFY_CENTER,
} from '@opentrons/components'
import {
  FLEX_ROBOT_TYPE,
  getModuleType,
  THERMOCYCLER_MODULE_TYPE,
} from '@opentrons/shared-data'

import {
  OFFSET_KIND_DEFAULT,
  selectSelectedLwDef,
  selectSelectedLwOverview,
} from '/app/redux/protocol-runs'

import type { LabwareDefinition2 } from '@opentrons/shared-data'
import type { ModuleOnDeck, LabwareOnDeck } from '@opentrons/components'
import type { EditOffsetContentProps } from '/app/organisms/LabwarePositionCheck/steps/HandleLabware/EditOffset'
import type { State } from '/app/redux/types'
import type {
  LPCWizardState,
  OffsetLocationDetails,
  SelectedLwOverview,
} from '/app/redux/protocol-runs'

// TODO(jh, 03-14-25): Current designs/behavior do not include rendering the
//  adapter beneath the labware if present, but let's add this!

/** On the LPC deck, the only visible labware should be the labware with an actively edited offset.
 * Modules are always visible if they are not in the actively utilized deck slot.
 * If modules are in the actively utilized deck slot:
 *  If LPCing the default offset, ensure the module is always cleared.
 *  If LPCing a location-specific offset, the module should only be present if the
 *    location-specific offset calls for the module to be present. */
export function LPCDeck({ runId }: EditOffsetContentProps): JSX.Element {
  const { protocolData, deckConfig } = useSelector(
    (state: State) => state.protocolRuns[runId]?.lpc as LPCWizardState
  )
  const selectedLwInfo = useSelector(
    selectSelectedLwOverview(runId)
  ) as SelectedLwOverview
  const labwareDef = useSelector(
    selectSelectedLwDef(runId)
  ) as LabwareDefinition2

  const offsetLocationDetails = selectedLwInfo.offsetLocationDetails as OffsetLocationDetails
  const { closestBeneathModuleModel, kind: offsetKind } = offsetLocationDetails

  const buildModulesOnDeck = (): ModuleOnDeck[] => {
    const allModulesOnDeck = protocolData.modules.map(mod => {
      return {
        moduleModel: mod.model,
        moduleLocation: mod.location,
        nestedLabwareDef: closestBeneathModuleModel != null ? labwareDef : null,
        innerProps:
          closestBeneathModuleModel != null &&
          getModuleType(closestBeneathModuleModel) === THERMOCYCLER_MODULE_TYPE
            ? { lidMotorState: 'open' }
            : {},
      }
    })

    if (
      offsetKind === OFFSET_KIND_DEFAULT ||
      closestBeneathModuleModel == null
    ) {
      return allModulesOnDeck.filter(
        moduleOnDeck =>
          moduleOnDeck.moduleLocation.slotName !==
          offsetLocationDetails.addressableAreaName
      )
    } else {
      return allModulesOnDeck
    }
  }

  const buildLabwareOnDeck = (): LabwareOnDeck[] => [
    { labwareLocation: offsetLocationDetails, definition: labwareDef },
  ]

  return (
    <Flex css={DECK_CONTAINER_STYLE}>
      <BaseDeck
        robotType={FLEX_ROBOT_TYPE}
        modulesOnDeck={buildModulesOnDeck()}
        labwareOnDeck={buildLabwareOnDeck()}
        deckConfig={deckConfig}
      />
    </Flex>
  )
}

const DECK_CONTAINER_STYLE = css`
  flex: 3;
  justify-content: ${JUSTIFY_CENTER};
  align-items: ${ALIGN_FLEX_START};
`
