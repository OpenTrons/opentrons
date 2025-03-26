import groupBy from 'lodash/groupBy'
import { useTranslation } from 'react-i18next'
import {
  getAllPipetteNames,
  getPipetteNameSpecs,
  GEN1,
  GEN2,
  SINGLE_CHANNEL,
  EIGHT_CHANNEL,
} from '@opentrons/shared-data'
import { Box, Flex } from '@opentrons/components'
import { Select } from '/app/atoms/SelectField/Select'

import type { PipetteNameSpecs } from '@opentrons/shared-data'
import type { ActionMeta, SingleValue, MultiValue } from 'react-select'
import type { SelectOption } from '/app/atoms/SelectField/Select'

export interface PipetteSelectProps {
  /** currently selected value, optional in case selecting triggers immediate action */
  pipetteName?: string | null
  /** react-select change handler */
  onPipetteChange: (
    pipetteName: string | null,
    e: ActionMeta<SelectOption>
  ) => void
  /** list of pipette names to omit */
  nameBlocklist?: string[]
  /** whether or not "None" shows up as the default option */
  enableNoneOption?: boolean
  /** input tabIndex */
  tabIndex?: number
}

const PIPETTE_SORT = ['maxVolume', 'channels'] as const

// @ts-expect-error(mc, 2021-04-27): use TS type guard for filter
const allPipetteNameSpecs: PipetteNameSpecs[] = getAllPipetteNames(
  ...PIPETTE_SORT
)
  .map(getPipetteNameSpecs)
  .filter(Boolean)

const specsByCategory = groupBy(allPipetteNameSpecs, 'displayCategory')

const specToOption = ({
  name,
  displayName,
}: PipetteNameSpecs): { value: string; label: string } => ({
  value: name,
  label: displayName,
})

export function PipetteSelect(props: PipetteSelectProps): JSX.Element {
  const { tabIndex, enableNoneOption, nameBlocklist = [] } = props
  const { t } = useTranslation('shared')
  const NONE = t('none')
  const OPTION_NONE = { value: '', label: NONE }
  const allowlist = ({ value }: SelectOption): boolean => {
    return !nameBlocklist.some(n => n === value)
  }
  const gen2Options = specsByCategory[GEN2].map(specToOption).filter(allowlist)
  const gen1Options = specsByCategory[GEN1].map(specToOption).filter(allowlist)
  const groupedOptions = [
    ...(enableNoneOption != null ? [OPTION_NONE] : []),
    ...(gen2Options.length > 0 ? [{ options: gen2Options }] : []),
    ...(gen1Options.length > 0 ? [{ options: gen1Options }] : []),
  ]

  const defaultValue = enableNoneOption != null ? OPTION_NONE : null
  const value =
    allPipetteNameSpecs
      .filter(s => s.name === props.pipetteName)
      .map(specToOption)[0] || defaultValue

  return (
    <Select
      isSearchable={false}
      options={groupedOptions}
      menuPortalTarget={document.body}
      styles={{ menuPortal: base => ({ ...base, zIndex: 10 }) }}
      value={value}
      defaultValue={defaultValue}
      width="15rem"
      tabIndex={tabIndex}
      onChange={(
        option: SingleValue<SelectOption> | MultiValue<SelectOption>,
        e: ActionMeta<SelectOption>
      ) => {
        const value = (option as SelectOption).value
          ? (option as SelectOption).value
          : null
        props.onPipetteChange(value, e)
      }}
      formatOptionLabel={(option, { context }) => {
        const { value } = option
        const label = option.label != null || value
        const specs = allPipetteNameSpecs.find(s => s.name === value)

        return context === 'value' || value === '' || specs == null ? (
          label
        ) : (
          <PipetteNameItem {...specs} />
        )
      }}
    />
  )
}

const PipetteNameItem = (props: PipetteNameSpecs): JSX.Element => {
  const { channels, displayName, displayCategory } = props
  const volumeClassMaybeMatch = displayName.match(/P\d+/)
  const volumeClass =
    volumeClassMaybeMatch != null ? volumeClassMaybeMatch[0] : ''

  let displayChannels = ''
  if (channels === 1) {
    displayChannels = SINGLE_CHANNEL
  } else if (channels === 8) {
    displayChannels = EIGHT_CHANNEL
  }

  return (
    <Flex>
      <Box cursor="default" minWidth="3.5rem">
        {volumeClass}
      </Box>
      <Box cursor="default" minWidth="7rem">
        {displayChannels}
      </Box>
      <Box cursor="default" minWidth="2.5rem">
        {displayCategory}
      </Box>
    </Flex>
  )
}
