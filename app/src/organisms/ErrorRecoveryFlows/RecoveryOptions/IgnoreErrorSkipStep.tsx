import * as React from 'react'
import head from 'lodash/head'
import { css } from 'styled-components'
import { useTranslation } from 'react-i18next'

import {
  DIRECTION_COLUMN,
  Flex,
  SPACING,
  StyledText,
  RESPONSIVENESS,
  RadioButton,
} from '@opentrons/components'

import {
  ODD_SECTION_TITLE_STYLE,
  RECOVERY_MAP,
  ODD_ONLY,
  DESKTOP_ONLY,
} from '../constants'
import { SelectRecoveryOption } from './SelectRecoveryOption'
import {
  RecoveryFooterButtons,
  RecoverySingleColumnContentWrapper,
  RecoveryRadioGroup,
} from '../shared'

import type { RecoveryContentProps } from '../types'

export function IgnoreErrorSkipStep(props: RecoveryContentProps): JSX.Element {
  const { recoveryMap } = props
  const { step, route } = recoveryMap
  const { IGNORE_AND_SKIP } = RECOVERY_MAP

  const buildContent = (): JSX.Element => {
    switch (step) {
      case IGNORE_AND_SKIP.STEPS.SELECT_IGNORE_KIND:
        return <IgnoreErrorStepHome {...props} />
      default:
        console.warn(`${step} in ${route} not explicitly handled. Rerouting.`)
        return <SelectRecoveryOption {...props} />
    }
  }

  return buildContent()
}

export function IgnoreErrorStepHome({
  recoveryCommands,
  routeUpdateActions,
}: RecoveryContentProps): JSX.Element | null {
  const { t } = useTranslation('error_recovery')
  const { FILL_MANUALLY_AND_SKIP } = RECOVERY_MAP
  const { ignoreErrorKindThisRun } = recoveryCommands
  const { proceedToRouteAndStep, goBackPrevStep } = routeUpdateActions

  const [selectedOption, setSelectedOption] = React.useState<IgnoreOption>(
    head(IGNORE_OPTIONS_IN_ORDER) as IgnoreOption
  )

  // It's safe to hard code the routing here, since only one route currently
  // utilizes ignoring. In the future, we may have to check the selectedRecoveryOption
  // and route appropriately.
  const ignoreOnce = (): void => {
    void proceedToRouteAndStep(
      FILL_MANUALLY_AND_SKIP.ROUTE,
      FILL_MANUALLY_AND_SKIP.STEPS.SKIP
    )
  }

  // See ignoreOnce comment.
  const ignoreAlways = (): void => {
    void ignoreErrorKindThisRun().then(() =>
      proceedToRouteAndStep(
        FILL_MANUALLY_AND_SKIP.ROUTE,
        FILL_MANUALLY_AND_SKIP.STEPS.SKIP
      )
    )
  }

  const primaryOnClick = (): void => {
    if (selectedOption === 'ignore_only_this_error') {
      ignoreOnce()
    } else if (selectedOption === 'ignore_all_errors_of_this_type') {
      ignoreAlways()
    } else {
      console.warn(`${selectedOption} not explictly handled.`)
    }
  }

  return (
    <RecoverySingleColumnContentWrapper css={DESKTOP_ONLY_GRID_GAP}>
      <StyledText
        css={ODD_SECTION_TITLE_STYLE}
        oddStyle="level4HeaderSemiBold"
        desktopStyle="headingSmallSemiBold"
      >
        {t('ignore_similar_errors_later_in_run')}
      </StyledText>
      <Flex
        flexDirection={DIRECTION_COLUMN}
        gridGap={SPACING.spacing4}
        css={ODD_ONLY}
      >
        <IgnoreOptions
          ignoreOptions={IGNORE_OPTIONS_IN_ORDER}
          setSelectedOption={setSelectedOption}
          selectedOption={selectedOption}
        />
      </Flex>
      <Flex
        flexDirection={DIRECTION_COLUMN}
        gridGap={SPACING.spacing4}
        css={DESKTOP_ONLY}
      >
        <RecoveryRadioGroup
          value={selectedOption}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setSelectedOption(e.currentTarget.value as IgnoreOption)
          }}
          options={IGNORE_OPTIONS_IN_ORDER.map(option => {
            return {
              value: option,
              children: (
                <StyledText
                  css={RADIO_GROUP_MARGIN}
                  desktopStyle="bodyDefaultRegular"
                >
                  {t(option)}
                </StyledText>
              ),
            }
          })}
        />
      </Flex>
      <RecoveryFooterButtons
        primaryBtnOnClick={primaryOnClick}
        secondaryBtnOnClick={goBackPrevStep}
      />
    </RecoverySingleColumnContentWrapper>
  )
}

interface IgnoreOptionsProps {
  ignoreOptions: IgnoreOption[]
  setSelectedOption: (ignoreOption: IgnoreOption) => void
  selectedOption?: IgnoreOption
}

// For ODD use only.
export function IgnoreOptions({
  setSelectedOption,
  ignoreOptions,
  selectedOption,
}: IgnoreOptionsProps): JSX.Element[] {
  const { t } = useTranslation('error_recovery')

  return ignoreOptions.map(ignoreOption => {
    const copyText = t(ignoreOption)

    return (
      <RadioButton
        key={`ignore_option_${ignoreOption}`}
        buttonLabel={copyText}
        buttonValue={copyText}
        onChange={() => {
          setSelectedOption(ignoreOption)
        }}
        isSelected={ignoreOption === selectedOption}
      />
    )
  })
}

type IgnoreOption = 'ignore_only_this_error' | 'ignore_all_errors_of_this_type'

const IGNORE_OPTIONS_IN_ORDER: IgnoreOption[] = [
  'ignore_only_this_error',
  'ignore_all_errors_of_this_type',
]

const RADIO_GROUP_MARGIN = css`
  @media not (${RESPONSIVENESS.touchscreenMediaQuerySpecs}) {
    margin-left: 0.5rem;
  }
`

const DESKTOP_ONLY_GRID_GAP = css`
  @media not (${RESPONSIVENESS.touchscreenMediaQuerySpecs}) {
    gap: 0rem;
  }
`
