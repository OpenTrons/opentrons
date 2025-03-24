import { useTranslation } from 'react-i18next'
import { SPACING, TYPOGRAPHY, LegacyStyledText } from '@opentrons/components'
import { LabwareListItem } from './LabwareListItem'
import type { StackItem } from '/app/transformations/commands'

interface OffDeckLabwareListProps {
  labwareItems: StackItem[]
  isFlex: boolean
}
export function OffDeckLabwareList(
  props: OffDeckLabwareListProps
): JSX.Element | null {
  const { labwareItems, isFlex } = props
  const { t } = useTranslation('protocol_setup')
  if (labwareItems.length < 1) return null
  return (
    <>
      <LegacyStyledText
        as="h3"
        fontWeight={TYPOGRAPHY.fontWeightSemiBold}
        textTransform={TYPOGRAPHY.textTransformCapitalize}
        margin={`${SPACING.spacing16} ${SPACING.spacing16} ${SPACING.spacing8}`}
      >
        {t('additional_off_deck_labware')}
      </LegacyStyledText>
      {labwareItems.map((labwareItem, index) => (
        <LabwareListItem
          key={index}
          attachedModuleInfo={{}}
          extraAttentionModules={[]}
          stackedItems={[labwareItem]}
          slotName="offDeck"
          isFlex={isFlex}
          showLabwareSVG
        />
      ))}
    </>
  )
}
