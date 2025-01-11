import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import { ALL, COLUMN, SINGLE } from '@opentrons/shared-data'
import { Flex, DropdownMenu, SPACING } from '@opentrons/components'
import { getEnablePartialTipSupport } from '../../../../../feature-flags/selectors'
import { getInitialDeckSetup } from '../../../../../step-forms/selectors'
import type { PipetteV2Specs } from '@opentrons/shared-data'
import type { DropdownOption } from '@opentrons/components'
import type { FieldProps } from '../types'

interface PartialTipFieldProps extends FieldProps {
  pipetteSpecs: PipetteV2Specs
}
export function PartialTipField(props: PartialTipFieldProps): JSX.Element {
  const {
    value: dropdownItem,
    updateValue,
    errorToShow,
    padding = `0 ${SPACING.spacing16}`,
    tooltipContent,
    pipetteSpecs,
  } = props
  const { t } = useTranslation('protocol_steps')
  const deckSetup = useSelector(getInitialDeckSetup)
  const enablePartialTip = useSelector(getEnablePartialTipSupport)
  const is96Channel = pipetteSpecs.channels === 96

  const tipracks = Object.values(deckSetup.labware).filter(
    labware => labware.def.parameters.isTiprack
  )
  const tipracksNotOnAdapter = tipracks.filter(
    tiprack => deckSetup.labware[tiprack.slot] == null
  )
  const noTipracksOnAdapter = tipracksNotOnAdapter.length === 0

  const options: DropdownOption[] = [
    {
      name: t('all'),
      value: ALL,
    },
  ]
  if (is96Channel) {
    options.push({
      name: t('column'),
      value: COLUMN,
      disabled: noTipracksOnAdapter,
      tooltipText: noTipracksOnAdapter
        ? t('form:step_edit_form.field.nozzles.option_tooltip.partial')
        : undefined,
    })
    if (enablePartialTip) {
      options.push({
        name: t('single_nozzle'),
        value: SINGLE,
        disabled: noTipracksOnAdapter,
        tooltipText: noTipracksOnAdapter
          ? t('form:step_edit_form.field.nozzles.option_tooltip.partial')
          : undefined,
      })
    }
  } else {
    options.push({
      name: t('single_nozzle'),
      value: SINGLE,
    })
  }

  const [selectedValue, setSelectedValue] = useState(
    dropdownItem || options[0].value
  )

  return (
    <Flex padding={padding}>
      <DropdownMenu
        width="100%"
        error={errorToShow}
        dropdownType="neutral"
        filterOptions={options}
        title={t('select_nozzles')}
        currentOption={
          options.find(option => option.value === selectedValue) ?? options[0]
        }
        onClick={value => {
          updateValue(value)
          setSelectedValue(value)
        }}
        tooltipText={tooltipContent}
      />
    </Flex>
  )
}
