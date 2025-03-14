import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import {
  DIRECTION_COLUMN,
  Flex,
  SPACING,
  Modal,
  JUSTIFY_SPACE_BETWEEN,
  ALIGN_CENTER,
  Btn,
  JUSTIFY_END,
  SecondaryButton,
  PrimaryButton,
  StyledText,
  Banner,
  InputField,
  TYPOGRAPHY,
} from '@opentrons/components'
import { WELL_BOTTOM, WELL_CENTER, WELL_TOP } from '@opentrons/shared-data'
import { prefixMap } from '../../../resources/utils'
import { getIsTouchTipField } from '../../../form-types'
import { LINK_BUTTON_STYLE } from '../../../atoms'
import { getMainPagePortalEl } from '../../../organisms'
import { TOO_MANY_DECIMALS, PERCENT_RANGE_TO_SHOW_WARNING } from './constants'
import { usePositionReference } from './hooks'
import * as utils from './utils'
import { TipPositionTopView } from './TipPositionTopView'
import { TipPositionSideView } from './TipPositionSideView'

import type { ChangeEvent, Dispatch, SetStateAction } from 'react'
import type { PositionReference } from '@opentrons/shared-data'
import type { StepFieldName } from '../../../form-types'
import type { FieldProps } from '../../../pages/Designer/ProtocolSteps/types'
import type { MoveLiquidPrefixType } from '../../../resources/types'

type Offset = 'x' | 'y' | 'z'
interface PositionSpec {
  name: StepFieldName
  value: number | null
  updateValue: (val?: number | null) => void
}
export type PositionSpecs = Record<Offset, PositionSpec>

interface TipPositionModalProps {
  closeModal: () => void
  specs: PositionSpecs
  wellDepthMm: number
  wellXWidthMm: number
  wellYWidthMm: number
  prefix: MoveLiquidPrefixType
  isIndeterminate?: boolean
  reference?: FieldProps | null
}

export function TipPositionModal(
  props: TipPositionModalProps
): JSX.Element | null {
  const {
    isIndeterminate,
    specs,
    wellDepthMm,
    wellXWidthMm,
    wellYWidthMm,
    closeModal,
    prefix,
    reference: referenceSpec,
  } = props
  const { t } = useTranslation([
    'modal',
    'button',
    'tooltip',
    'shared',
    'application',
  ])
  const [view, setView] = useState<'top' | 'side'>('side')
  const { z: zSpec, y: ySpec, x: xSpec } = specs

  if (zSpec == null || xSpec == null || ySpec == null) {
    console.error(
      'expected to find specs for one of the positions but could not'
    )
  }

  const defaultMmFromBottom = utils.getDefaultMmFromEdge({
    name: zSpec.name,
  })

  const [zValue, setZValue] = useState<string | null>(
    zSpec?.value == null
      ? String(referenceSpec?.value === WELL_BOTTOM ? defaultMmFromBottom : 0)
      : String(zSpec?.value)
  )
  const [yValue, setYValue] = useState<string | null>(
    ySpec?.value == null ? null : String(ySpec?.value)
  )
  const [xValue, setXValue] = useState<string | null>(
    xSpec?.value == null ? null : String(xSpec?.value)
  )
  const { positionReferenceDropdown, reference } = usePositionReference({
    initialReference: referenceSpec?.value as PositionReference,
    zValue: Number(zValue),
    updateZValue: setZValue,
    wellDepth: wellDepthMm,
  })

  // in this modal, pristinity hides the OUT_OF_BOUNDS error only.
  const [isPristine, setPristine] = useState<boolean>(true)
  const getMinMaxMmFromBottom = (
    reference: PositionReference,
    wellDepth: number
  ): {
    maxMmFromBottom: number
    minMmFromBottom: number
  } => {
    if (getIsTouchTipField(zSpec?.name ?? '')) {
      return {
        maxMmFromBottom: utils.roundValue(wellDepthMm, 'up'),
        minMmFromBottom: utils.roundValue(wellDepthMm / 2, 'up'),
      }
    }
    let [min, max]: [number, number] = [0, wellDepthMm]
    switch (reference) {
      case WELL_CENTER:
        ;[min, max] = [-wellDepth / 2, wellDepth / 2]
        break
      case WELL_TOP:
        ;[min, max] = [-wellDepth, 0]
        break
      default:
        break
    }
    return {
      maxMmFromBottom: utils.roundValue(max, 'up'),
      minMmFromBottom: utils.roundValue(min, 'up'),
    }
  }

  const { maxMmFromBottom, minMmFromBottom } = getMinMaxMmFromBottom(
    reference,
    wellDepthMm
  )
  const { minValue: yMinWidth, maxValue: yMaxWidth } = utils.getMinMaxWidth(
    wellYWidthMm
  )
  const { minValue: xMinWidth, maxValue: xMaxWidth } = utils.getMinMaxWidth(
    wellXWidthMm
  )

  const createErrors = (
    value: string | null,
    min: number,
    max: number
  ): utils.Error[] => {
    return utils.getErrors({ minMm: min, maxMm: max, value })
  }
  const zErrors = createErrors(zValue, minMmFromBottom, maxMmFromBottom)
  const xErrors = createErrors(xValue, xMinWidth, xMaxWidth)
  const yErrors = createErrors(yValue, yMinWidth, yMaxWidth)

  const hasErrors =
    zErrors.length > 0 || xErrors.length > 0 || yErrors.length > 0
  const hasVisibleErrors = isPristine
    ? zErrors.includes(TOO_MANY_DECIMALS) ||
      xErrors.includes(TOO_MANY_DECIMALS) ||
      yErrors.includes(TOO_MANY_DECIMALS)
    : hasErrors

  const createErrorText = (
    errors: utils.Error[],
    min: number,
    max: number
  ): string | null => {
    return utils.getErrorText({ errors, minMm: min, maxMm: max, isPristine, t })
  }

  const roundedXMin = utils.roundValue(xMinWidth, 'up')
  const roundedYMin = utils.roundValue(yMinWidth, 'up')
  const roundedXMax = utils.roundValue(xMaxWidth, 'down')
  const roundedYMax = utils.roundValue(yMaxWidth, 'down')

  const zErrorText = createErrorText(zErrors, minMmFromBottom, maxMmFromBottom)
  const xErrorText = createErrorText(xErrors, roundedXMin, roundedXMax)
  const yErrorText = createErrorText(yErrors, roundedYMin, roundedYMax)

  const handleDone = (): void => {
    if (!hasErrors) {
      zSpec?.updateValue(zValue === null ? null : Number(zValue))
      xSpec?.updateValue(xValue === null ? null : Number(xValue))
      ySpec?.updateValue(yValue === null ? null : Number(yValue))
      referenceSpec?.updateValue(reference)
      closeModal()
    }
  }

  const handleCancel = (): void => {
    closeModal()
  }

  const handleChange = (
    newValueRaw: string,
    setValue: Dispatch<SetStateAction<string | null>>
  ): void => {
    // if string, strip non-number characters from string and cast to number
    const newValue =
      typeof newValueRaw === 'string'
        ? newValueRaw.replace(/[^-.0-9]/g, '')
        : String(newValueRaw)

    if (newValue === '.') {
      setValue('0.')
    } else {
      setValue(newValue)
    }
    setPristine(false)
  }

  const isXValueNearEdge =
    xValue != null &&
    (parseInt(xValue) > PERCENT_RANGE_TO_SHOW_WARNING * xMaxWidth ||
      parseInt(xValue) < PERCENT_RANGE_TO_SHOW_WARNING * xMinWidth)
  const isYValueNearEdge =
    yValue != null &&
    (parseInt(yValue) > PERCENT_RANGE_TO_SHOW_WARNING * yMaxWidth ||
      parseInt(yValue) < PERCENT_RANGE_TO_SHOW_WARNING * yMinWidth)

  // logic for determining if tip is at bottom based on reference
  const isZValueAtBottom =
    zValue != null
      ? utils.getIsZValueAtBottom(zValue, wellDepthMm, reference)
      : false

  return createPortal(
    <Modal
      marginLeft="0"
      type="info"
      width="47rem"
      closeOnOutsideClick
      title={t('shared:tip_position', { prefix: prefixMap[prefix] })}
      onClose={handleCancel}
      footer={
        <Flex
          justifyContent={JUSTIFY_SPACE_BETWEEN}
          padding={SPACING.spacing24}
          alignItems={ALIGN_CENTER}
        >
          <Btn
            onClick={() => {
              setXValue('0')
              setYValue('0')
              setZValue('1')
            }}
            css={LINK_BUTTON_STYLE}
          >
            {t('shared:reset_to_default')}
          </Btn>
          <Flex gridGap={SPACING.spacing8} justifyContent={JUSTIFY_END}>
            <SecondaryButton onClick={handleCancel}>
              {t('shared:cancel')}
            </SecondaryButton>
            <PrimaryButton onClick={handleDone} disabled={hasVisibleErrors}>
              {t('shared:save')}
            </PrimaryButton>
          </Flex>
        </Flex>
      }
    >
      <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing8}>
        {isXValueNearEdge || isYValueNearEdge || isZValueAtBottom ? (
          <Banner type="warning">
            <StyledText desktopStyle="bodyDefaultRegular">
              {t('tip_position.warning')}
            </StyledText>
          </Banner>
        ) : null}
        <Flex gridGap={SPACING.spacing40}>
          <Flex
            flexDirection={DIRECTION_COLUMN}
            gridGap={SPACING.spacing12}
            width="100%"
          >
            <StyledText desktopStyle="bodyDefaultRegular">
              {t(`tip_position.body.${zSpec?.name}`)}
            </StyledText>
            {positionReferenceDropdown}
            <InputField
              title={t('tip_position.field_titles.x_position')}
              caption={
                xErrorText == null
                  ? t('tip_position.caption', {
                      min: roundedXMin,
                      max: roundedXMax,
                    })
                  : null
              }
              error={xErrorText}
              id="TipPositionModal_x_custom_input"
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                handleChange(e.target.value, setXValue)
              }}
              units={t('application:units.millimeter')}
              value={xValue ?? ''}
            />
            <InputField
              tooltipText={t('tooltip:y_position_value')}
              title={t('tip_position.field_titles.y_position')}
              caption={
                yErrorText == null
                  ? t('tip_position.caption', {
                      min: roundedYMin,
                      max: roundedYMax,
                    })
                  : null
              }
              error={yErrorText}
              id="TipPositionModal_y_custom_input"
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                handleChange(e.target.value, setYValue)
              }}
              units={t('application:units.millimeter')}
              value={yValue ?? ''}
            />
            <InputField
              title={t('tip_position.field_titles.z_position')}
              caption={
                zErrorText == null
                  ? t('tip_position.caption', {
                      min: minMmFromBottom,
                      max: maxMmFromBottom,
                    })
                  : null
              }
              error={zErrorText}
              id="TipPositionModal_z_custom_input"
              isIndeterminate={zValue === null && isIndeterminate}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                handleChange(e.target.value, setZValue)
              }}
              units={t('application:units.millimeter')}
              value={zValue !== null ? zValue : ''}
            />
          </Flex>
          <Flex
            flexDirection={DIRECTION_COLUMN}
            gridGap={SPACING.spacing8}
            width="100%"
          >
            <Flex justifyContent={JUSTIFY_SPACE_BETWEEN}>
              <StyledText desktopStyle="bodyDefaultRegular">
                {view === 'side' ? 'Side view' : 'Top view'}
              </StyledText>
              <Btn
                fontWeight={TYPOGRAPHY.fontWeightSemiBold}
                css={LINK_BUTTON_STYLE}
                onClick={() => {
                  setView(view === 'side' ? 'top' : 'side')
                }}
              >
                {t('shared:swap_view')}
              </Btn>
            </Flex>
            {view === 'side' ? (
              <TipPositionSideView
                mmFromBottom={
                  zValue !== null
                    ? utils.getMmFromBottom(
                        Number(zValue),
                        reference,
                        wellDepthMm
                      )
                    : defaultMmFromBottom
                }
                wellDepthMm={wellDepthMm}
                xPosition={parseInt(xValue ?? '0')}
                xWidthMm={wellXWidthMm}
              />
            ) : (
              <TipPositionTopView
                xPosition={parseInt(xValue ?? '0')}
                xWidthMm={wellXWidthMm}
                yPosition={parseInt(yValue ?? '0')}
                yWidthMm={wellYWidthMm}
              />
            )}
          </Flex>
        </Flex>
      </Flex>
    </Modal>,
    getMainPagePortalEl()
  )
}
