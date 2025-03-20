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
import {
  getDisabledLiquidClasses,
  getSortedLiquidClassDefs,
  isFlexPipette,
} from '@opentrons/shared-data'
import { selectors as stepFormSelectors } from '../../../../../../step-forms'
import { getLiquidEntities } from '../../../../../../step-forms/selectors'
import { getLiquidClassDisplayName } from '../../../../../../liquid-defs/utils'
import { getFlexNameConversion } from '../../../../../../file-data/selectors/utils'
import type { ChangeEvent, Dispatch, SetStateAction } from 'react'
import type { LiquidClassesOption } from '@opentrons/shared-data'
import type { FieldPropsByName } from '../../types'
import type { FormData } from '../../../../../../form-types'

interface LiquidClassesStepToolsProps {
  propsForFields: FieldPropsByName
  formData: FormData
  setShowFormErrors?: Dispatch<SetStateAction<boolean>>
}
export const LiquidClassesStepTools = ({
  propsForFields,
  formData,
  setShowFormErrors,
}: LiquidClassesStepToolsProps): JSX.Element => {
  const { t } = useTranslation(['liquids'])
  const liquids = useSelector(getLiquidEntities)
  const pipetteEntities = useSelector(stepFormSelectors.getPipetteEntities)
  const sortedLiquidClassDefs = getSortedLiquidClassDefs()
  const pipetteName = pipetteEntities[formData.pipette]?.name
  const pipetteSpec = pipetteEntities[formData.pipette]?.spec
  const pipetteModel =
    isFlexPipette(pipetteName) === true
      ? getFlexNameConversion(pipetteSpec)
      : pipetteName

  const { volume, tipRack, pipette, path } = formData
  const disabledLiquidClasses = getDisabledLiquidClasses(
    {
      volume,
      tipRack,
      pipette,
      path,
    },
    pipetteModel
  )
  const liquidClassToLiquidsMap: Record<string, string[]> = {}
  Object.values(liquids).forEach(({ displayName, liquidClass }) => {
    if (liquidClass !== undefined) {
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
    ? getLiquidClassDisplayName(assignedLiquidClasses[0] ?? null)
    : t('dont_use_liquid_class')

  const [selectedLiquidClass, setSelectedLiquidClass] = useState(
    defaultSelectedLiquidClass
  )

  useMemo(() => {
    setSelectedLiquidClass(defaultSelectedLiquidClass)
  }, [defaultSelectedLiquidClass])

  const liquidClassOptions = [
    ...Object.entries(sortedLiquidClassDefs).map(
      ([liquidClassDefName, { displayName, description }]) => ({
        name: displayName,
        value: liquidClassDefName,
        subButtonLabel:
          liquidClassToLiquidsMap[liquidClassDefName] != null
            ? t('assigned_liquid', {
                liquidName: liquidClassToLiquidsMap[liquidClassDefName].join(
                  ', '
                ),
              })
            : description,
      })
    ),
    {
      name: t('dont_use_liquid_class'),
      value: '',
      subButtonLabel: '',
    },
  ]
  if (!hasAssignedLiquidClasses) {
    const poppedOption = liquidClassOptions.pop()
    if (poppedOption !== undefined) {
      liquidClassOptions.unshift(poppedOption)
    }
  }

  return (
    <Flex
      flexDirection={DIRECTION_COLUMN}
      width="100%"
      paddingY={SPACING.spacing16}
      gridGap={SPACING.spacing12}
    >
      <Flex padding={`0 ${SPACING.spacing16}`}>
        <StyledText desktopStyle="bodyDefaultRegular">
          {t('apply_liquid_classes')}
        </StyledText>
      </Flex>
      <Flex
        flexDirection={DIRECTION_COLUMN}
        gridGap={SPACING.spacing4}
        width="100%"
        padding={`0 ${SPACING.spacing16}`}
      >
        {liquidClassOptions.map(options => {
          const { name, subButtonLabel, value } = options
          return (
            <RadioButton
              key={name}
              onChange={(e: ChangeEvent<any>) => {
                propsForFields.liquidClass.updateValue(e.currentTarget.value)
                setSelectedLiquidClass(name)
                setShowFormErrors?.(false)
              }}
              buttonLabel={name}
              buttonValue={value}
              isSelected={selectedLiquidClass === name}
              buttonSubLabel={{
                label: subButtonLabel ?? undefined,
                align: 'vertical',
              }}
              largeDesktopBorderRadius
              disabled={disabledLiquidClasses?.has(name as LiquidClassesOption)}
            />
          )
        })}
      </Flex>
    </Flex>
  )
}
