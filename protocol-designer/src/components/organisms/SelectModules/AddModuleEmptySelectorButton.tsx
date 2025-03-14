import {
  EmptySelectorButton,
  FLEX_MAX_CONTENT,
  Flex,
  Tooltip,
  TYPOGRAPHY,
  useHoverTooltip,
} from '@opentrons/components'
import {
  ABSORBANCE_READER_V1,
  getModuleDisplayName,
} from '@opentrons/shared-data'

import type { ModuleModel } from '@opentrons/shared-data'

interface AddModuleEmptySelectorButtonProps {
  moduleModel: ModuleModel
  areSlotsAvailable: boolean
  hasGripper: boolean
  handleAddModule: (arg0: ModuleModel, arg1: boolean) => void
  tooltipText: string
}

export function AddModuleEmptySelectorButton(
  props: AddModuleEmptySelectorButtonProps
): JSX.Element {
  const {
    moduleModel,
    areSlotsAvailable,
    hasGripper,
    handleAddModule,
    tooltipText,
  } = props
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
        <Tooltip tooltipProps={tooltipProps}>{tooltipText}</Tooltip>
      ) : null}
    </>
  )
}
