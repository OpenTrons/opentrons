import groupBy from 'lodash/groupBy'
import {
  getAllPipetteNames,
  getPipetteNameSpecs,
  GEN1,
  GEN2,
  FLEX,
} from '@opentrons/shared-data'
import { Flex } from '../primitives'
import { Select, CONTEXT_VALUE } from '../forms'
import styles from './PipetteSelect.module.css'
import type { PipetteNameSpecs } from '@opentrons/shared-data'
import type { ActionMeta, SingleValue, MultiValue } from 'react-select'
import type { SelectOption } from '../forms'
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
  tabIndex?: string | number
  /** classes to apply to the top-level component */
  className?: string
  /** custom id to be applied. likely to be used as a data test id for e2e testing */
  id?: string
  disabled?: boolean
}

// TODO(mc, 2019-10-14): i18n
const NONE = 'None'
const OPTION_NONE = { value: '', label: NONE }

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

/**
 * @deprecated The component is no longer used and will be removed in a future release.
 */
export const PipetteSelect = (props: PipetteSelectProps): JSX.Element => {
  const {
    tabIndex,
    className,
    enableNoneOption,
    id,
    nameBlocklist = [],
    disabled = false,
  } = props
  const allowlist = ({ value }: SelectOption): boolean => {
    return !nameBlocklist.some(n => n === value)
  }
  const flexOptions = specsByCategory[FLEX].map(specToOption).filter(allowlist)
  const gen2Options = specsByCategory[GEN2].map(specToOption).filter(allowlist)
  const gen1Options = specsByCategory[GEN1].map(specToOption).filter(allowlist)
  const groupedOptions = [
    ...(enableNoneOption ? [OPTION_NONE] : []),
    ...(flexOptions.length > 0 ? [{ options: flexOptions }] : []),
    ...(gen2Options.length > 0 ? [{ options: gen2Options }] : []),
    ...(gen1Options.length > 0 ? [{ options: gen1Options }] : []),
  ]
  const defaultValue = enableNoneOption ? OPTION_NONE : null
  const value =
    allPipetteNameSpecs
      .filter(s => s.name === props.pipetteName)
      .map(specToOption)[0] || defaultValue

  return (
    <Select
      isSearchable={false}
      menuPosition="fixed"
      className={className}
      options={groupedOptions}
      value={value}
      isDisabled={disabled}
      defaultValue={defaultValue}
      tabIndex={tabIndex as number}
      id={id}
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
        const label = option.label || value
        const specs = allPipetteNameSpecs.find(s => s.name === value)

        return context === CONTEXT_VALUE || value === '' || !specs ? (
          label
        ) : (
          <PipetteNameItem {...specs} />
        )
      }}
    />
  )
}

const PipetteNameItem = (props: PipetteNameSpecs): JSX.Element => {
  const { channels, name, displayCategory } = props
  const volumeClassMaybeMatch = name && name.match(/p(\d+)/i)
  const volumeClass = volumeClassMaybeMatch ? volumeClassMaybeMatch[1] : ''
  let displayChannels = ''
  if (channels === 1) {
    displayChannels = 'Single-Channel'
  } else if (channels === 8) {
    displayChannels = '8-Channel'
  } else if (channels === 96) {
    displayChannels = '96-Channel'
  }
  return (
    <Flex
      data-test={dataIdFormat(
        'PipetteNameItem',
        volumeClass,
        channels,
        displayCategory
      )}
    >
      <div className={styles.pipette_volume_class}>{volumeClass}</div>
      <div className={styles.pipette_channels}>{displayChannels}</div>
      <div className={styles.pipette_category}>
        {channels === 96 ? 'FLEX' : displayCategory}
      </div>
    </Flex>
  )
}

const dataIdFormat = (
  componentName: string,
  volumeClass: string,
  channels: number,
  displayCategory: string
): string => {
  let dataIdFormatChannels
  if (channels === 1) {
    dataIdFormatChannels = 'SingleChannel'
  } else if (channels === 8) {
    dataIdFormatChannels = 'MultiChannel'
  } else {
    dataIdFormatChannels = '96-Channel'
  }
  const dataIdFormatVolumeClass = volumeClass.toLowerCase()
  const dataIdFormatDisplayCategory =
    displayCategory.charAt(0) + displayCategory.slice(1).toLowerCase()

  return `${componentName}_${dataIdFormatVolumeClass}${dataIdFormatChannels}${dataIdFormatDisplayCategory}`
}
