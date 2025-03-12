import { Trans, useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'

import {
  TYPOGRAPHY,
  LegacyStyledText,
  getLabwareDisplayLocation,
} from '@opentrons/components'
import { FLEX_ROBOT_TYPE } from '@opentrons/shared-data'

import {
  selectSelectedLwRelatedAdapterDisplayName,
  selectIsSelectedLwTipRack,
  selectSelectedLwOverview,
  selectSelectedLwDisplayName,
  OFFSET_KIND_DEFAULT,
} from '/app/redux/protocol-runs'
import { UnorderedList } from '/app/molecules/UnorderedList'
import { DescriptionContent } from '/app/molecules/InterventionModal'

import type { DisplayLocationParams } from '@opentrons/components'
import type {
  LPCWizardState,
  SelectedLwOverview,
  OffsetLocationDetails,
} from '/app/redux/protocol-runs'
import type { State } from '/app/redux/types'
import type { LPCWizardContentProps } from '/app/organisms/LabwarePositionCheck/types'
import type { EditOffsetContentProps } from '/app/organisms/LabwarePositionCheck/steps/HandleLabware/EditOffset'

export function PlaceItemInstruction(
  props: EditOffsetContentProps
): JSX.Element {
  const { runId } = props
  const { t: commandTextT } = useTranslation('protocol_command_text')
  const { t } = useTranslation('labware_position_check')
  const { protocolData, labwareDefs } = useSelector(
    (state: State) => state.protocolRuns[runId]?.lpc as LPCWizardState
  )
  const isLwTiprack = useSelector(selectIsSelectedLwTipRack(runId))
  const selectedLwInfo = useSelector(
    selectSelectedLwOverview(runId)
  ) as SelectedLwOverview
  const offsetLocationDetails = selectedLwInfo.offsetLocationDetails as OffsetLocationDetails

  const buildHeader = (): string =>
    t('prepare_item_in_location', {
      item: isLwTiprack ? t('tip_rack') : t('labware'),
      location: slotOnlyDisplayLocation,
    })

  const buildDisplayParams = (): Omit<
    DisplayLocationParams,
    'detailLevel'
  > => ({
    t: commandTextT,
    loadedModules: protocolData.modules,
    loadedLabwares: protocolData.labware,
    robotType: FLEX_ROBOT_TYPE,
    location: offsetLocationDetails,
  })

  const slotOnlyDisplayLocation = getLabwareDisplayLocation({
    detailLevel: 'slot-only',
    ...buildDisplayParams(),
  })
  const fullDisplayLocation = getLabwareDisplayLocation({
    detailLevel: 'full',
    allRunDefs: labwareDefs,
    ...buildDisplayParams(),
  })

  return (
    <DescriptionContent
      headline={buildHeader()}
      message={
        <UnorderedList
          items={[
            <ClearDeckCopy
              {...props}
              key="clear_deck"
              isLwTiprack={isLwTiprack}
              slotOnlyDisplayLocation={slotOnlyDisplayLocation}
              fullDisplayLocation={fullDisplayLocation}
              labwareInfo={selectedLwInfo}
            />,
            <PlaceItemInstructionContents
              key={slotOnlyDisplayLocation}
              isLwTiprack={isLwTiprack}
              slotOnlyDisplayLocation={slotOnlyDisplayLocation}
              fullDisplayLocation={fullDisplayLocation}
              labwareInfo={selectedLwInfo}
              {...props}
            />,
          ]}
        />
      }
    />
  )
}

interface PlaceItemInstructionContentProps extends LPCWizardContentProps {
  isLwTiprack: boolean
  slotOnlyDisplayLocation: string
  fullDisplayLocation: string
  labwareInfo: SelectedLwOverview
}

// See LPCDeck for clarification of deck behavior.
function ClearDeckCopy({
  slotOnlyDisplayLocation,
  labwareInfo,
}: PlaceItemInstructionContentProps): JSX.Element {
  const { t } = useTranslation('labware_position_check')

  const {
    kind: offsetKind,
    moduleModel,
  } = labwareInfo.offsetLocationDetails as OffsetLocationDetails

  return offsetKind === OFFSET_KIND_DEFAULT || moduleModel == null ? (
    <Trans
      t={t}
      i18nKey="clear_deck_all_lw_all_modules_from"
      tOptions={{ slot: slotOnlyDisplayLocation }}
      components={{ strong: <strong /> }}
    />
  ) : (
    <Trans t={t} i18nKey="clear_deck_all_lw_leave_modules" />
  )
}

function PlaceItemInstructionContents({
  runId,
  isLwTiprack,
  slotOnlyDisplayLocation,
  fullDisplayLocation,
  labwareInfo,
}: PlaceItemInstructionContentProps): JSX.Element {
  const { t } = useTranslation('labware_position_check')

  const { adapterId } = labwareInfo.offsetLocationDetails ?? { adapterId: null }
  const labwareDisplayName = useSelector(selectSelectedLwDisplayName(runId))
  const adapterDisplayName = useSelector(
    selectSelectedLwRelatedAdapterDisplayName(runId)
  )

  if (isLwTiprack) {
    return (
      <Trans
        t={t}
        i18nKey="place_a_full_tip_rack_in_location"
        tOptions={{
          tip_rack: labwareDisplayName,
          location: fullDisplayLocation,
        }}
        components={{
          bold: (
            <LegacyStyledText
              as="span"
              fontWeight={TYPOGRAPHY.fontWeightSemiBold}
            />
          ),
        }}
      />
    )
  } else if (adapterId != null) {
    return (
      <Trans
        t={t}
        i18nKey="place_labware_in_adapter_in_location"
        tOptions={{
          adapter: adapterDisplayName,
          labware: labwareDisplayName,
          location: slotOnlyDisplayLocation,
        }}
        components={{
          bold: (
            <LegacyStyledText
              as="span"
              fontWeight={TYPOGRAPHY.fontWeightSemiBold}
            />
          ),
        }}
      />
    )
  } else {
    return (
      <Trans
        t={t}
        i18nKey="place_labware_in_location"
        tOptions={{
          labware: labwareDisplayName,
          location: fullDisplayLocation,
        }}
        components={{
          bold: (
            <LegacyStyledText
              as="span"
              fontWeight={TYPOGRAPHY.fontWeightSemiBold}
            />
          ),
        }}
      />
    )
  }
}
