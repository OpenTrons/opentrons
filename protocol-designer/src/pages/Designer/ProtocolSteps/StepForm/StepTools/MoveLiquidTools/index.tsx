import { useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import {
  DIRECTION_COLUMN,
  Flex,
  RadioButton,
  SPACING,
  StyledText,
} from '@opentrons/components'
import { getAllLiquidClassDefs } from '@opentrons/shared-data'
import { getEnableLiquidClasses } from '../../../../../../feature-flags/selectors'
import { getLiquidEntities } from '../../../../../../step-forms/selectors'
import { getLiquidClassDisplayName } from '../../../../../../liquid-defs/utils'
import { FirstStepMoveLiquidTools } from './FirstStepMoveLiquidTools'
import { SecondStepsMoveLiquidTools } from './SecondStepsMoveLiquidTools'

import type { StepFormProps } from '../../types'

export function MoveLiquidTools(props: StepFormProps): JSX.Element {
  const {
    toolboxStep,
    propsForFields,
    formData,
    visibleFormErrors,
    setShowFormErrors,
    tab,
    setTab,
  } = props
  const { t } = useTranslation(['protocol_steps'])
  const enableLiquidClasses = useSelector(getEnableLiquidClasses)
  const liquids = useSelector(getLiquidEntities)
  const liquidClassDefs = getAllLiquidClassDefs()

  const liquidClassToLiquidsMap: Record<string, string[]> = {}
  Object.values(liquids).forEach(({ displayName, liquidClass }) => {
    if (liquidClass) {
      if (!liquidClassToLiquidsMap[liquidClass]) {
        liquidClassToLiquidsMap[liquidClass] = []
      }
      liquidClassToLiquidsMap[liquidClass].push(displayName)
    }
  })

  const assignedLiquidClasses = Object.values(liquids)
    .map(liquid => liquid.liquidClass)
    .filter(Boolean)
  const hasAssignedLiquidClasses = assignedLiquidClasses.length > 0

  const defaultSelectedLiquidClass = hasAssignedLiquidClasses
    ? t(
        `protocol_steps:liquid_classes.${getLiquidClassDisplayName(
          assignedLiquidClasses[0]
        )
          ?.split('-')[0]
          .toLowerCase()}`
      )
    : t('protocol_steps:no_liquid_class')

  const [selectedLiquidClass, setSelectedLiquidClass] = useState(
    defaultSelectedLiquidClass
  )

  useMemo(() => {
    setSelectedLiquidClass(defaultSelectedLiquidClass)
  }, [defaultSelectedLiquidClass])

  const liquidClassOptions = [
    ...Object.entries(liquidClassDefs).map(
      ([liquidClassDefName, { displayName }]) => ({
        name: t(
          `protocol_steps:liquid_classes.${displayName
            .split('-')[0]
            .toLowerCase()}`
        ),
        subButtonLabel:
          liquidClassToLiquidsMap[liquidClassDefName] != null
            ? t('protocol_steps:assigned_liquid', {
                liquidName: liquidClassToLiquidsMap[liquidClassDefName].join(
                  ', '
                ),
              })
            : t(
                `protocol_steps:liquid_classes.${displayName
                  .split('-')[0]
                  .toLowerCase()}_subtext`
              ),
      })
    ),
    {
      name: t('protocol_steps:no_liquid_class'),
      value: 'noLiquidClass',
      subButtonLabel: '',
    },
  ]

  if (!hasAssignedLiquidClasses) {
    liquidClassOptions.unshift(liquidClassOptions.pop()!)
  }

  // Object mapping step numbers to functions returning the correct JSX
  const stepComponents: Record<number, () => JSX.Element> = {
    0: () => (
      <FirstStepMoveLiquidTools
        propsForFields={propsForFields}
        formData={formData}
        visibleFormErrors={visibleFormErrors}
      />
    ),
    1: () => (
      <>
        {enableLiquidClasses ? (
          <Flex
            flexDirection={DIRECTION_COLUMN}
            width="100%"
            paddingY={SPACING.spacing16}
            gridGap={SPACING.spacing12}
          >
            <Flex padding={`0 ${SPACING.spacing16}`}>
              <StyledText desktopStyle="bodyDefaultRegular">
                {t('protocol_steps:apply_liquid_classes')}
              </StyledText>
            </Flex>
            <Flex
              flexDirection={DIRECTION_COLUMN}
              gridGap={SPACING.spacing4}
              width="100%"
              padding={`0 ${SPACING.spacing16}`}
            >
              {liquidClassOptions.map(options => {
                const { name, subButtonLabel } = options
                console.log(name)
                return (
                  <RadioButton
                    key={name}
                    onChange={() => {
                      setSelectedLiquidClass(name)
                    }}
                    buttonLabel={name}
                    subButtonLabel={subButtonLabel}
                    buttonValue={name}
                    isSelected={selectedLiquidClass === name}
                    largeDesktopBorderRadius
                  />
                )
              })}
            </Flex>
          </Flex>
        ) : (
          <SecondStepsMoveLiquidTools
            propsForFields={propsForFields}
            formData={formData}
            tab={tab}
            setTab={setTab}
            setShowFormErrors={setShowFormErrors}
            visibleFormErrors={visibleFormErrors}
          />
        )}
      </>
    ),
    2: () => (
      <SecondStepsMoveLiquidTools
        propsForFields={propsForFields}
        formData={formData}
        tab={tab}
        setTab={setTab}
        setShowFormErrors={setShowFormErrors}
        visibleFormErrors={visibleFormErrors}
      />
    ),
  }

  const StepComponent = stepComponents[toolboxStep] ?? stepComponents[0]
  return StepComponent()
}
