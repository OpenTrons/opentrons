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
  selectSelectedLabwareDef,
  selectSelectedLabwareWithOffsetInfo,
} from '/app/redux/protocol-runs'

import type { LabwareDefinition2 } from '@opentrons/shared-data'
import type { ModuleOnDeck, LabwareOnDeck } from '@opentrons/components'
import type { EditOffsetContentProps } from '/app/organisms/LabwarePositionCheck/steps/HandleLabware/EditOffset'
import type { State } from '/app/redux/types'
import type {
  LPCWizardState,
  OffsetLocationDetails,
  SelectedLabwareWithOffsetInfo,
} from '/app/redux/protocol-runs'

// TOME TODO: Grep for applied and replace with location specific!

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
    selectSelectedLabwareWithOffsetInfo(runId)
  ) as SelectedLabwareWithOffsetInfo
  const labwareDef = useSelector(
    selectSelectedLabwareDef(runId)
  ) as LabwareDefinition2

  const offsetLocationDetails = selectedLwInfo.offsetLocationDetails as OffsetLocationDetails
  const { moduleModel, kind: offsetKind } = offsetLocationDetails

  const buildModulesOnDeck = (): ModuleOnDeck[] => {
    const allModulesOnDeck = protocolData.modules.map(mod => {
      return {
        moduleModel: mod.model,
        moduleLocation: mod.location,
        nestedLabwareDef: moduleModel != null ? labwareDef : null,
        innerProps:
          moduleModel != null &&
          getModuleType(moduleModel) === THERMOCYCLER_MODULE_TYPE
            ? { lidMotorState: 'open' }
            : {},
      }
    })

    if (offsetKind === 'default' || moduleModel == null) {
      return allModulesOnDeck.filter(
        moduleOnDeck =>
          moduleOnDeck.moduleLocation.slotName !==
          offsetLocationDetails.slotName
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
