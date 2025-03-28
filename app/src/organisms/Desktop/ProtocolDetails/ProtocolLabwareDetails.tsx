import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import {
  ALIGN_CENTER,
  COLORS,
  DIRECTION_COLUMN,
  DIRECTION_ROW,
  Flex,
  Icon,
  InfoScreen,
  MenuItem,
  NO_WRAP,
  OverflowBtn,
  POSITION_ABSOLUTE,
  POSITION_RELATIVE,
  SPACING,
  StyledText,
  useMenuHandleClickOutside,
} from '@opentrons/components'
import { Divider } from '/app/atoms/structure'
import { getTopPortalEl } from '/app/App/portal'
import { LabwareDetails } from '/app/organisms/Desktop/Labware/LabwareDetails'
import { getRequiredLabwareDetailsFromLoadCommands } from '/app/transformations/commands'
import type { MouseEventHandler } from 'react'
import type { RunTimeCommand } from '@opentrons/shared-data'
import type { LabwareDefAndDate } from '/app/local-resources/labware'

export const ProtocolLabwareDetails = (props: {
  commands: RunTimeCommand[]
}): JSX.Element => {
  const { commands } = props
  const { t } = useTranslation('protocol_details')

  const labwareAndLidDetails = getRequiredLabwareDetailsFromLoadCommands(
    commands
  )

  return (
    <>
      {labwareAndLidDetails.length > 0 ? (
        <Flex flexDirection={DIRECTION_COLUMN} width="100%">
          <Flex flexDirection={DIRECTION_ROW}>
            <StyledText
              desktopStyle="bodyDefaultRegular"
              color={COLORS.grey60}
              marginBottom={SPACING.spacing8}
              data-testid="ProtocolLabwareDetails_labware_name"
              width="66%"
            >
              {t('labware_name')}
            </StyledText>
            <StyledText
              desktopStyle="bodyDefaultRegular"
              color={COLORS.grey60}
              data-testid="ProtocolLabwareDetails_quantity"
            >
              {t('quantity')}
            </StyledText>
          </Flex>
          {labwareAndLidDetails?.map((labware, index) => (
            <ProtocolLabwareDetailItem
              key={index}
              namespace={labware.labwareDef.namespace}
              displayName={labware.labwareDef.metadata.displayName}
              quantity={labware.quantity}
              labware={{ definition: labware.labwareDef }}
              lidDisplayName={labware.lidDisplayName}
              data-testid={`ProtocolLabwareDetails_item_${index}`}
            />
          ))}
        </Flex>
      ) : (
        <InfoScreen content={t('no_labware_specified')} />
      )}
    </>
  )
}

interface ProtocolLabwareDetailItemProps {
  namespace: string
  displayName: string
  quantity: number
  lidDisplayName?: string
  labware: LabwareDefAndDate
}

export const ProtocolLabwareDetailItem = (
  props: ProtocolLabwareDetailItemProps
): JSX.Element => {
  const { t } = useTranslation('protocol_details')
  const { namespace, displayName, quantity, labware, lidDisplayName } = props
  return (
    <>
      <Divider width="100%" />
      <Flex
        flexDirection={DIRECTION_ROW}
        marginY={SPACING.spacing8}
        alignItems={ALIGN_CENTER}
      >
        <Flex
          flexDirection={DIRECTION_ROW}
          alignItems={ALIGN_CENTER}
          width="66%"
          marginRight={SPACING.spacing20}
        >
          {namespace === 'opentrons' ? (
            <Icon
              color={COLORS.blue50}
              name="check-decagram"
              height="1rem"
              minHeight="1rem"
              minWidth="1rem"
              marginRight={SPACING.spacing4}
            />
          ) : (
            <Flex marginLeft={SPACING.spacing20} />
          )}
          <Flex flexDirection={DIRECTION_COLUMN}>
            <StyledText
              desktopStyle="bodyDefaultRegular"
              paddingRight={SPACING.spacing32}
            >
              {displayName}
            </StyledText>
            {lidDisplayName != null ? (
              <StyledText
                desktopStyle="bodyDefaultRegular"
                color={COLORS.grey60}
                paddingRight={SPACING.spacing32}
              >
                {t('with_lid_name', { lid: lidDisplayName })}
              </StyledText>
            ) : null}
          </Flex>
        </Flex>
        <StyledText desktopStyle="bodyDefaultRegular">{quantity}</StyledText>
        <LabwareDetailOverflowMenu labware={labware} />
      </Flex>
    </>
  )
}

interface LabwareDetailOverflowMenuProps {
  labware: LabwareDefAndDate
}

export const LabwareDetailOverflowMenu = (
  props: LabwareDetailOverflowMenuProps
): JSX.Element => {
  const { labware } = props
  const { t } = useTranslation('protocol_details')
  const {
    menuOverlay,
    handleOverflowClick,
    showOverflowMenu,
    setShowOverflowMenu,
  } = useMenuHandleClickOutside()
  const [
    showLabwareDetailSlideout,
    setShowLabwareDetailSlideout,
  ] = useState<boolean>(false)

  const handleClickMenuItem: MouseEventHandler<HTMLButtonElement> = e => {
    e.preventDefault()
    setShowOverflowMenu(false)
    setShowLabwareDetailSlideout(true)
  }
  return (
    <Flex
      flexDirection={DIRECTION_COLUMN}
      position={POSITION_RELATIVE}
      marginRight={SPACING.spacing8}
      marginLeft={SPACING.spacingAuto}
    >
      <Flex>
        <OverflowBtn onClick={handleOverflowClick} />
      </Flex>
      {showOverflowMenu ? (
        <Flex
          whiteSpace={NO_WRAP}
          zIndex={10}
          borderRadius="4px 4px 0px 0px"
          boxShadow="0px 1px 3px rgba(0, 0, 0, 0.2)"
          position={POSITION_ABSOLUTE}
          backgroundColor={COLORS.white}
          top="2.3rem"
          right={0}
          flexDirection={DIRECTION_COLUMN}
        >
          <MenuItem onClick={handleClickMenuItem}>
            {t('go_to_labware_definition')}
          </MenuItem>
        </Flex>
      ) : null}
      {createPortal(
        <>
          {menuOverlay}
          {showLabwareDetailSlideout ? (
            <LabwareDetails
              labware={labware}
              onClose={() => {
                setShowLabwareDetailSlideout(false)
              }}
            />
          ) : null}
        </>,
        getTopPortalEl()
      )}
    </Flex>
  )
}
