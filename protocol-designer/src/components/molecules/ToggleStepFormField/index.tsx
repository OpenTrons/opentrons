import {
  ALIGN_CENTER,
  Check,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  JUSTIFY_SPACE_BETWEEN,
  ListButton,
  SPACING,
  StyledText,
  Tooltip,
  useHoverTooltip,
} from '@opentrons/components'

import { ToggleButton } from '../../atoms'

interface ToggleStepFormFieldProps {
  title: string
  isSelected: boolean
  toggleUpdateValue: (value: unknown) => void
  toggleValue: unknown
  tooltipContent: string | null
  isDisabled?: boolean
  onLabel?: string
  offLabel?: string
  toggleElement?: 'toggle' | 'checkbox'
}
export function ToggleStepFormField(
  props: ToggleStepFormFieldProps
): JSX.Element {
  const {
    title,
    isSelected,
    onLabel,
    offLabel,
    toggleUpdateValue,
    toggleValue,
    tooltipContent,
    isDisabled = false,
    toggleElement = 'toggle',
  } = props
  const [targetProps, tooltipProps] = useHoverTooltip()

  return (
    <>
      <ListButton
        type="noActive"
        padding={SPACING.spacing12}
        onClick={() => {
          if (!isDisabled) {
            toggleUpdateValue(!toggleValue)
          }
        }}
        disabled={isDisabled}
      >
        <Flex width="100%" flexDirection={DIRECTION_COLUMN}>
          <Flex
            justifyContent={JUSTIFY_SPACE_BETWEEN}
            alignItems={ALIGN_CENTER}
          >
            <StyledText
              desktopStyle="bodyDefaultRegular"
              color={isDisabled ? COLORS.grey40 : COLORS.black90}
              {...targetProps}
            >
              {title}
            </StyledText>
            <Flex alignItems={ALIGN_CENTER} gridGap={SPACING.spacing4}>
              <StyledText
                desktopStyle="bodyDefaultRegular"
                color={isDisabled ? COLORS.grey40 : COLORS.grey60}
              >
                {isSelected ? onLabel : offLabel}
              </StyledText>
              {toggleElement === 'toggle' ? (
                <ToggleButton
                  label={isSelected ? onLabel : offLabel}
                  toggledOn={isSelected}
                />
              ) : (
                <Check color={COLORS.blue50} isChecked={isSelected} />
              )}
            </Flex>
          </Flex>
        </Flex>
      </ListButton>
      {tooltipContent != null ? (
        <Tooltip tooltipProps={tooltipProps}>{tooltipContent}</Tooltip>
      ) : null}
    </>
  )
}
