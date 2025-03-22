import { useTranslation } from 'react-i18next'
import {
  DIRECTION_COLUMN,
  Flex,
  POSITION_FIXED,
  SPACING,
  Tag,
} from '@opentrons/components'

interface HotKeyDisplayProps {
  targetWidth: number
}

export function HotKeyDisplay({
  targetWidth,
}: HotKeyDisplayProps): JSX.Element {
  const { t } = useTranslation('starting_deck_state')
  return (
    <Flex
      position={POSITION_FIXED}
      left={`calc(1.5rem + ${targetWidth}px)`}
      bottom="0.75rem"
      gridGap={SPACING.spacing4}
      flexDirection={DIRECTION_COLUMN}
    >
      <Tag text={t('double_click_to_edit')} type="default" shrinkToContent />
      <Tag
        text={t('shift_click_to_select_range')}
        type="default"
        shrinkToContent
      />
      <Tag
        text={t('command_click_to_multi_select')}
        type="default"
        shrinkToContent
      />
    </Flex>
  )
}
