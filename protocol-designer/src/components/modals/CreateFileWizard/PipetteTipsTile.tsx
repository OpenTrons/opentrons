import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { css } from 'styled-components'
import { useDispatch, useSelector } from 'react-redux'
import {
  DIRECTION_COLUMN,
  Flex,
  Text,
  SPACING,
  Mount,
  ALIGN_CENTER,
  PrimaryButton,
  JUSTIFY_SPACE_BETWEEN,
  TYPOGRAPHY,
  ALIGN_START,
  BORDERS,
  DIRECTION_ROW,
  COLORS,
  OutlineButton,
  Icon,
  JUSTIFY_CENTER,
  WRAP,
  Btn,
  JUSTIFY_END,
} from '@opentrons/components'
import { getPipetteNameSpecs } from '@opentrons/shared-data'
import { getLabwareDefsByURI } from '../../../labware-defs/selectors'
import { createCustomTiprackDef } from '../../../labware-defs/actions'
import { getAllowAllTipracks } from '../../../feature-flags/selectors'
import { getTiprackOptions } from '../utils'
import { GoBack } from './GoBack'
import { EquipmentOption } from './EquipmentOption'
import { HandleEnter } from './HandleEnter'

import type { PipetteName } from '@opentrons/shared-data'
import type { FormState, WizardTileProps } from './types'
import type { ThunkDispatch } from 'redux-thunk'
import type { BaseState } from '../../../types'
import type { UseFormReturn } from 'react-hook-form'

export function FirstPipetteTipsTile(props: WizardTileProps): JSX.Element {
  return <PipetteTipsTile {...props} mount="left" />
}
export function SecondPipetteTipsTile(
  props: WizardTileProps
): JSX.Element | null {
  const { proceed, watch } = props
  const pipettesByMount = watch('pipettesByMount')
  const leftPipetteName = pipettesByMount.left.pipetteName
  const rightPipetteName = pipettesByMount.right.pipetteName

  const shouldProceed =
    leftPipetteName === 'p1000_96' || rightPipetteName === ''

  if (shouldProceed) {
    proceed()
    return null
  }

  return <PipetteTipsTile {...props} mount="right" />
}

interface PipetteTipsTileProps extends WizardTileProps {
  mount: Mount
}
export function PipetteTipsTile(props: PipetteTipsTileProps): JSX.Element {
  const { proceed, goBack, mount, watch } = props
  const { t } = useTranslation(['modal', 'application'])
  const pipettesByMount = watch('pipettesByMount')

  const firstPipetteName = pipettesByMount[mount].pipetteName
  const tileHeader = t('choose_tips_for_pipette', {
    pipetteName:
      firstPipetteName != null
        ? getPipetteNameSpecs(firstPipetteName as PipetteName)?.displayName ??
          ''
        : '',
  })

  return (
    <HandleEnter onEnter={proceed}>
      <Flex flexDirection={DIRECTION_COLUMN} padding={SPACING.spacing32}>
        <Flex
          flexDirection={DIRECTION_COLUMN}
          height="25.5rem"
          gridGap={SPACING.spacing32}
        >
          <Text as="h2">{tileHeader}</Text>
          <PipetteTipsField {...props} />
        </Flex>
        <Flex
          alignItems={ALIGN_CENTER}
          justifyContent={JUSTIFY_SPACE_BETWEEN}
          width="100%"
          paddingTop={SPACING.spacing8}
        >
          <GoBack onClick={() => goBack()} />
          <PrimaryButton onClick={() => proceed()}>
            {t('application:next')}
          </PrimaryButton>
        </Flex>
      </Flex>
    </HandleEnter>
  )
}

const INPUT_STYLE = css`
  background-color: ${COLORS.blue50};
  border-radius: ${BORDERS.borderRadiusFull};
  box-shadow: none;
  color: ${COLORS.grey10};
  overflow: no-wrap;
  padding-left: ${SPACING.spacing16};
  padding-right: ${SPACING.spacing16};
  text-transform: ${TYPOGRAPHY.textTransformNone};
  white-space: nowrap;
  border: none;
  padding-top: 8px;
  ${TYPOGRAPHY.labelSemiBold}
  height: max-content;
  width: auto;
  font-size: ${TYPOGRAPHY.fontSizeP};
  input {
    display: none;
  }

  &:hover {
    background-color: ${COLORS.blue55};
    box-shadow: none;
  }

  &:active {
    background-color: ${COLORS.blue60};
  }
`

const ACCORDION_STYLE = css`
  border-radius: 50%;
  &:hover {
    background: ${COLORS.grey30};
  }
  &:active {
    background: ${COLORS.grey35};
  }
`
interface PipetteTipsFieldProps extends UseFormReturn<FormState> {
  mount: Mount
}

function PipetteTipsField(props: PipetteTipsFieldProps): JSX.Element | null {
  const { mount, watch, setValue } = props
  const { t } = useTranslation('modal')
  const pipettesByMount = watch('pipettesByMount')
  const allowAllTipracks = useSelector(getAllowAllTipracks)
  const dispatch = useDispatch<ThunkDispatch<BaseState, any, any>>()
  const [showCustomTipracks, setShowCustomTipracks] = React.useState<boolean>(
    false
  )
  const allLabware = useSelector(getLabwareDefsByURI)
  const selectedPipetteName = pipettesByMount[mount].pipetteName
  const selectedPipetteDefaultTipracks =
    selectedPipetteName != null
      ? getPipetteNameSpecs(selectedPipetteName as PipetteName)
          ?.defaultTipracks ?? []
      : []
  const tiprackOptions = getTiprackOptions({
    allLabware: allLabware,
    allowAllTipracks: allowAllTipracks,
    selectedPipetteName: selectedPipetteName,
  })

  const defaultTiprackOptions = tiprackOptions.filter(option =>
    allowAllTipracks
      ? !option.value.includes('custom_beta')
      : selectedPipetteDefaultTipracks.includes(option.value)
  )

  const customTiprackOptions = tiprackOptions.filter(option =>
    option.value.includes('custom_beta')
  )

  const currentValue = pipettesByMount[mount].tiprackDefURI

  React.useEffect(() => {
    if (currentValue === undefined) {
      setValue(
        `pipettesByMount.${mount}.tiprackDefURI`,
        tiprackOptions[0]?.value ?? ''
      )
    }
  }, [currentValue, setValue, tiprackOptions])

  return (
    <Flex
      flexDirection={DIRECTION_COLUMN}
      overflowY="scroll"
      gridGap={SPACING.spacing8}
    >
      <Flex flexWrap="wrap" gridGap={SPACING.spacing4} alignSelf={ALIGN_CENTER}>
        {defaultTiprackOptions.map(o => (
          <EquipmentOption
            key={o.name}
            isSelected={currentValue === o.value}
            text={o.name}
            onClick={() => {
              setValue(`pipettesByMount.${mount}.tiprackDefURI`, o.value)
            }}
            width="21.75rem"
            minHeight="4rem"
          />
        ))}
      </Flex>
      <Flex justifyContent={JUSTIFY_END} alignItems={ALIGN_CENTER}>
        <Btn
          aria-label="PipetteTipsTile_customTipButton"
          onClick={() => setShowCustomTipracks(!showCustomTipracks)}
        >
          <Icon
            css={ACCORDION_STYLE}
            size="1.5rem"
            name={showCustomTipracks ? 'minus' : 'plus'}
          />
        </Btn>
      </Flex>
      {showCustomTipracks ? (
        <>
          <Flex
            flexDirection={DIRECTION_ROW}
            alignItems={ALIGN_CENTER}
            justifyContent={JUSTIFY_SPACE_BETWEEN}
          >
            <Text as="h4">{t('custom_tiprack')}</Text>

            <OutlineButton Component="label" css={INPUT_STYLE}>
              <Flex
                flexDirection={DIRECTION_ROW}
                alignItems={ALIGN_CENTER}
                gridGap={SPACING.spacing2}
              >
                <Icon name="plus" size="1rem" />
                {t('upload')}
              </Flex>
              <input
                type="file"
                onChange={e => dispatch(createCustomTiprackDef(e))}
              />
            </OutlineButton>
          </Flex>
          {customTiprackOptions.length > 0 ? (
            <Flex
              flexWrap={WRAP}
              gridGap={SPACING.spacing4}
              alignSelf={
                customTiprackOptions.length > 1 ? ALIGN_CENTER : ALIGN_START
              }
            >
              {customTiprackOptions.map(o => (
                <EquipmentOption
                  key={o.name}
                  isSelected={currentValue === o.value}
                  text={o.name}
                  onClick={() => {
                    setValue(`pipettesByMount.${mount}.tiprackDefURI`, o.value)
                  }}
                  width="21.75rem"
                  minHeight="4rem"
                />
              ))}
            </Flex>
          ) : (
            <Flex
              justifyContent={JUSTIFY_CENTER}
              alignItems={ALIGN_CENTER}
              width="100%"
              height="8.5rem"
              backgroundColor={COLORS.grey35}
              padding={SPACING.spacing8}
              border={BORDERS.lineBorder}
              borderRadius={BORDERS.borderRadius8}
            >
              <Text
                as="h4"
                fontWeight={TYPOGRAPHY.fontWeightRegular}
                color={COLORS.grey60}
              >
                {t('upload_tiprack')}
              </Text>
            </Flex>
          )}
        </>
      ) : null}
    </Flex>
  )
}
