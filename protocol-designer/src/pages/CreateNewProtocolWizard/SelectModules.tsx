import { useTranslation } from 'react-i18next'
import {
  ALIGN_CENTER,
  BORDERS,
  COLORS,
  DIRECTION_COLUMN,
  EmptySelectorButton,
  FLEX_MAX_CONTENT,
  Flex,
  ListItem,
  SPACING,
  StyledText,
  Tooltip,
  TYPOGRAPHY,
  useHoverTooltip,
  WRAP,
} from '@opentrons/components'
import {
  ABSORBANCE_READER_V1,
  FLEX_ROBOT_TYPE,
  getModuleDisplayName,
  getModuleType,
} from '@opentrons/shared-data'

import { uuid } from '../../utils'
import { useKitchen } from '../../organisms/Kitchen/hooks'
import { ModuleDiagram } from './ModuleDiagram'
import { WizardBody } from './WizardBody'
import {
  DEFAULT_SLOT_MAP_FLEX,
  DEFAULT_SLOT_MAP_OT2,
  FLEX_SUPPORTED_MODULE_MODELS,
  OT2_SUPPORTED_MODULE_MODELS,
} from './constants'
import { getNumSlotsAvailable } from './utils'
import { HandleEnter } from '../../atoms/HandleEnter'
import { PDListItemCustomize as ListItemCustomize } from '../CreateNewProtocolWizard/PDListItemCustomize'

import type { ModuleModel, ModuleType } from '@opentrons/shared-data'
import type { FormModule } from '../../step-forms'
import type { WizardTileProps } from './types'

export function SelectModules(props: WizardTileProps): JSX.Element | null {
  const { goBack, proceed, watch, setValue } = props
  const { t } = useTranslation(['create_new_protocol', 'shared'])
  const { makeSnackbar } = useKitchen()
  const fields = watch('fields')
  const modules = watch('modules')
  const additionalEquipment = watch('additionalEquipment')
  const robotType = fields.robotType
  const supportedModules =
    robotType === FLEX_ROBOT_TYPE
      ? FLEX_SUPPORTED_MODULE_MODELS
      : OT2_SUPPORTED_MODULE_MODELS
  const filteredSupportedModules = supportedModules.filter(
    moduleModel =>
      !(
        modules != null &&
        Object.values(modules).some(module =>
          robotType === FLEX_ROBOT_TYPE
            ? module.model === moduleModel
            : module.type === getModuleType(moduleModel)
        )
      )
  )
  const hasGripper = additionalEquipment.some(aE => aE === 'gripper')

  const handleAddModule = (
    moduleModel: ModuleModel,
    hasNoAvailableSlots: boolean
  ): void => {
    if (hasNoAvailableSlots) {
      makeSnackbar(t('slots_limit_reached') as string)
    } else {
      setValue('modules', {
        ...modules,
        [uuid()]: {
          model: moduleModel,
          type: getModuleType(moduleModel),
          slot:
            robotType === FLEX_ROBOT_TYPE
              ? DEFAULT_SLOT_MAP_FLEX[moduleModel]
              : DEFAULT_SLOT_MAP_OT2[getModuleType(moduleModel)],
        },
      })
    }
  }

  const handleRemoveModule = (moduleType: ModuleType): void => {
    const updatedModules =
      modules != null
        ? Object.fromEntries(
            Object.entries(modules).filter(
              ([key, value]) => value.type !== moduleType
            )
          )
        : {}
    setValue('modules', updatedModules)
  }

  return (
    <HandleEnter onEnter={proceed}>
      <WizardBody
        robotType={robotType}
        stepNumber={robotType === FLEX_ROBOT_TYPE ? 4 : 3}
        header={t('add_modules')}
        goBack={() => {
          goBack(1)
          setValue('modules', null)
        }}
        proceed={() => {
          proceed(1)
        }}
      >
        <Flex flexDirection={DIRECTION_COLUMN}>
          <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing12}>
            {filteredSupportedModules.length > 0 ||
            !(
              filteredSupportedModules.length === 1 &&
              filteredSupportedModules[0] === 'absorbanceReaderV1'
            ) ? (
              <StyledText desktopStyle="headingSmallBold">
                {t('which_modules')}
              </StyledText>
            ) : null}
            <Flex gridGap={SPACING.spacing4} flexWrap={WRAP}>
              {filteredSupportedModules
                .sort((moduleA, moduleB) => moduleA.localeCompare(moduleB))
                .map(moduleModel => {
                  const numSlotsAvailable = getNumSlotsAvailable(
                    modules,
                    additionalEquipment,
                    moduleModel
                  )
                  return (
                    <AddModuleEmptySelectorButton
                      key={moduleModel}
                      moduleModel={moduleModel}
                      areSlotsAvailable={numSlotsAvailable > 0}
                      hasGripper={hasGripper}
                      handleAddModule={handleAddModule}
                    />
                  )
                })}
            </Flex>
            {modules != null && Object.keys(modules).length > 0 ? (
              <Flex
                flexDirection={DIRECTION_COLUMN}
                gridGap={SPACING.spacing12}
                paddingTop={
                  filteredSupportedModules.length === 1 &&
                  filteredSupportedModules[0] === 'absorbanceReaderV1'
                    ? 0
                    : SPACING.spacing32
                }
              >
                <StyledText desktopStyle="headingSmallBold">
                  {t('modules_added')}
                </StyledText>
                <Flex
                  flexDirection={DIRECTION_COLUMN}
                  gridGap={SPACING.spacing4}
                >
                  {Object.entries(modules)
                    .sort(([, moduleA], [, moduleB]) =>
                      moduleA.model.localeCompare(moduleB.model)
                    )
                    .reduce<Array<FormModule & { count: number; key: string }>>(
                      (acc, [key, module]) => {
                        const existingModule = acc.find(
                          m => m.type === module.type
                        )
                        if (existingModule != null) {
                          existingModule.count++
                        } else {
                          acc.push({ ...module, count: 1, key })
                        }
                        return acc
                      },
                      []
                    )
                    .map(module => (
                      <ListItem type="noActive" key={`${module.model}`}>
                        <ListItemCustomize
                          linkText={t('remove')}
                          onClick={() => {
                            handleRemoveModule(module.type)
                          }}
                          header={getModuleDisplayName(module.model)}
                          leftHeaderItem={
                            <Flex
                              padding={SPACING.spacing2}
                              backgroundColor={COLORS.white}
                              borderRadius={BORDERS.borderRadius8}
                              alignItems={ALIGN_CENTER}
                              width="3.75rem"
                              height="3.625rem"
                            >
                              <ModuleDiagram
                                type={module.type}
                                model={module.model}
                              />
                            </Flex>
                          }
                        />
                      </ListItem>
                    ))}
                </Flex>
              </Flex>
            ) : null}
          </Flex>
        </Flex>
      </WizardBody>
    </HandleEnter>
  )
}

interface AddModuleEmptySelectorButtonProps {
  moduleModel: ModuleModel
  areSlotsAvailable: boolean
  hasGripper: boolean
  handleAddModule: (arg0: ModuleModel, arg1: boolean) => void
}

function AddModuleEmptySelectorButton(
  props: AddModuleEmptySelectorButtonProps
): JSX.Element {
  const { moduleModel, areSlotsAvailable, hasGripper, handleAddModule } = props
  const { t } = useTranslation('create_new_protocol')
  const [targetProps, tooltipProps] = useHoverTooltip()
  const disableGripperRequired =
    !hasGripper && moduleModel === ABSORBANCE_READER_V1

  return (
    <>
      <Flex {...targetProps} width={FLEX_MAX_CONTENT}>
        <EmptySelectorButton
          disabled={!areSlotsAvailable || disableGripperRequired}
          textAlignment={TYPOGRAPHY.textAlignLeft}
          iconName="plus"
          text={getModuleDisplayName(moduleModel)}
          onClick={() => {
            handleAddModule(moduleModel, !areSlotsAvailable)
          }}
        />
      </Flex>
      {disableGripperRequired ? (
        <Tooltip tooltipProps={tooltipProps}>
          {t('add_gripper_for_absorbance_reader')}
        </Tooltip>
      ) : null}
    </>
  )
}
