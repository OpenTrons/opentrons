import { Trans, useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'

import { TYPOGRAPHY, LegacyStyledText } from '@opentrons/components'

import {
  selectIsSelectedLwTipRack,
  selectSelectedLwOverview,
  OFFSET_KIND_DEFAULT,
  selectLwDisplayName,
  getFlexSlotNameOnly,
} from '/app/redux/protocol-runs'
import { UnorderedList } from '/app/molecules/UnorderedList'
import { DescriptionContent } from '/app/molecules/InterventionModal'

import type { TFunction } from 'i18next'
import type {
  LPCWizardState,
  SelectedLwOverview,
  OffsetLocationDetails,
  LabwareStackupDetail,
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
  const { protocolData } = useSelector(
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

  const slotOnlyDisplayLocation = getFlexSlotNameOnly(
    offsetLocationDetails,
    protocolData,
    commandTextT as TFunction
  )

  // The "clear deck" copy handles the module case.
  const lwOnlyLocSeq = offsetLocationDetails.lwModOnlyStackupDetails.filter(
    c => c.kind === 'labware'
  ) as LabwareStackupDetail[]

  return (
    <DescriptionContent
      headline={buildHeader()}
      message={
        <UnorderedList
          items={[
            <ClearDeckCopy
              {...props}
              key="clear_deck"
              slotOnlyDisplayLocation={slotOnlyDisplayLocation}
              labwareInfo={selectedLwInfo}
            />,
            ...lwOnlyLocSeq.map((component, index) => (
              <PlaceItemInstructionContent
                key={`${slotOnlyDisplayLocation}-${index}`}
                isLwTiprack={isLwTiprack}
                slotOnlyDisplayLocation={slotOnlyDisplayLocation}
                labwareInfo={selectedLwInfo}
                lwComponent={component}
                isFirstItemInStackup={index === 0}
                {...props}
              />
            )),
          ]}
        />
      }
    />
  )
}

interface PlaceItemInstructionContentProps extends LPCWizardContentProps {
  isLwTiprack: boolean
  slotOnlyDisplayLocation: string
  labwareInfo: SelectedLwOverview
  lwComponent: LabwareStackupDetail
  isFirstItemInStackup: boolean
}

// See LPCDeck for clarification of deck behavior.
function ClearDeckCopy({
  slotOnlyDisplayLocation,
  labwareInfo,
}: Pick<
  PlaceItemInstructionContentProps,
  'labwareInfo' | 'slotOnlyDisplayLocation'
>): JSX.Element {
  const { t } = useTranslation('labware_position_check')

  const {
    kind: offsetKind,
    closestBeneathModuleModel,
  } = labwareInfo.offsetLocationDetails as OffsetLocationDetails

  return offsetKind === OFFSET_KIND_DEFAULT ||
    closestBeneathModuleModel == null ? (
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

function PlaceItemInstructionContent({
  runId,
  isLwTiprack,
  slotOnlyDisplayLocation,
  lwComponent,
  isFirstItemInStackup,
}: PlaceItemInstructionContentProps): JSX.Element {
  const { t } = useTranslation('labware_position_check')

  const displayName = useSelector(
    selectLwDisplayName(runId, lwComponent.labwareUri)
  )

  if (isLwTiprack) {
    return (
      <Trans
        t={t}
        i18nKey={
          isFirstItemInStackup
            ? 'place_a_full_tip_rack_in_location'
            : 'next_place_a_full_tip_rack_in_location'
        }
        tOptions={{
          tip_rack: displayName,
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
        i18nKey={
          isFirstItemInStackup
            ? 'place_labware_in_location'
            : 'next_place_labware_in_location'
        }
        tOptions={{
          labware: displayName,
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
  }
}
