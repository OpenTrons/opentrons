import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import styled, { css } from 'styled-components'

import {
  ALIGN_CENTER,
  BORDERS,
  Btn,
  COLORS,
  DeckInfoLabel,
  DIRECTION_COLUMN,
  DIRECTION_ROW,
  DISPLAY_FLEX,
  DISPLAY_GRID,
  Flex,
  Icon,
  JUSTIFY_CENTER,
  JUSTIFY_SPACE_BETWEEN,
  LabwareRender,
  MODULE_ICON_NAME_BY_TYPE,
  SIZE_AUTO,
  SPACING,
  StyledText,
  TYPOGRAPHY,
  WELL_LABEL_OPTIONS,
} from '@opentrons/components'
import { useCreateLiveCommandMutation } from '@opentrons/react-api-client'
import {
  getTopLabwareInfo,
  getModuleDisplayName,
  getModuleType,
  HEATERSHAKER_MODULE_TYPE,
  MAGNETIC_MODULE_TYPE,
  TC_MODULE_LOCATION_OT2,
  TC_MODULE_LOCATION_OT3,
  THERMOCYCLER_MODULE_TYPE,
  THERMOCYCLER_MODULE_V2,
} from '@opentrons/shared-data'

import { getLocationInfoNames } from '/app/transformations/commands'
import { ToggleButton } from '/app/atoms/buttons'
import { Divider } from '/app/atoms/structure'
import { SecureLabwareModal } from './SecureLabwareModal'

import type {
  HeaterShakerCloseLatchCreateCommand,
  HeaterShakerOpenLatchCreateCommand,
  RunTimeCommand,
  ModuleType,
  LabwareDefinition2,
  LoadLabwareRunTimeCommand,
} from '@opentrons/shared-data'
import type { ModuleRenderInfoForProtocol } from '/app/resources/runs'
import type { LabwareSetupItem } from '/app/transformations/commands'
import type { ModuleTypesThatRequireExtraAttention } from '../utils/getModuleTypesThatRequireExtraAttention'

const LabwareRow = styled.div`
  display: ${DISPLAY_GRID};
  grid-template-columns: 90px 12fr;
  border-style: ${BORDERS.styleSolid};
  border-width: 1px;
  border-color: ${COLORS.grey30};
  border-radius: ${BORDERS.borderRadius4};
  padding: ${SPACING.spacing12} ${SPACING.spacing16} ${SPACING.spacing12}
    ${SPACING.spacing24};
`

interface LabwareListItemProps extends LabwareSetupItem {
  attachedModuleInfo: { [moduleId: string]: ModuleRenderInfoForProtocol }
  extraAttentionModules: ModuleTypesThatRequireExtraAttention[]
  isFlex: boolean
  commands: RunTimeCommand[]
  showLabwareSVG?: boolean
}

export function LabwareListItem(
  props: LabwareListItemProps
): JSX.Element | null {
  const {
    attachedModuleInfo,
    nickName: bottomLabwareNickname,
    initialLocation,
    moduleModel,
    extraAttentionModules,
    isFlex,
    commands,
    showLabwareSVG,
    labwareId: bottomLabwareId,
  } = props
  const loadLabwareCommands = commands?.filter(
    (command): command is LoadLabwareRunTimeCommand =>
      command.commandType === 'loadLabware'
  )

  const { topLabwareId, topLabwareDefinition } = getTopLabwareInfo(
    bottomLabwareId ?? '',
    loadLabwareCommands
  )
  const {
    slotName,
    labwareName,
    labwareNickname,
    labwareQuantity,
    adapterName: bottomLabwareName,
  } = getLocationInfoNames(topLabwareId, commands)

  const isStacked = labwareQuantity > 1 || bottomLabwareId !== topLabwareId

  const { i18n, t } = useTranslation('protocol_setup')
  const [
    secureLabwareModalType,
    setSecureLabwareModalType,
  ] = useState<ModuleType | null>(null)
  const { createLiveCommand } = useCreateLiveCommandMutation()
  const [isLatchLoading, setIsLatchLoading] = useState<boolean>(false)
  const [isLatchClosed, setIsLatchClosed] = useState<boolean>(false)

  let slotInfo: string | null = slotName
  if (initialLocation === 'offDeck') {
    slotInfo = i18n.format(t('off_deck'), 'upperCase')
  }

  let moduleDisplayName: string | null = null
  let moduleType: ModuleType | null = null
  let extraAttentionText: JSX.Element | null = null
  let secureLabwareInstructions: JSX.Element | null = null
  let isCorrectHeaterShakerAttached: boolean = false
  let isHeaterShakerInProtocol: boolean = false
  let latchCommand:
    | HeaterShakerOpenLatchCreateCommand
    | HeaterShakerCloseLatchCreateCommand

  if (moduleModel != null) {
    moduleType = getModuleType(moduleModel)
    moduleDisplayName = getModuleDisplayName(moduleModel)

    const moduleTypeNeedsAttention = extraAttentionModules.find(
      extraAttentionModType => extraAttentionModType === moduleType
    )

    switch (moduleTypeNeedsAttention) {
      case MAGNETIC_MODULE_TYPE:
      case THERMOCYCLER_MODULE_TYPE:
        if (moduleType === THERMOCYCLER_MODULE_TYPE) {
          slotInfo = isFlex ? TC_MODULE_LOCATION_OT3 : TC_MODULE_LOCATION_OT2
        }
        if (moduleModel !== THERMOCYCLER_MODULE_V2) {
          secureLabwareInstructions = (
            <Btn
              css={css`
                color: ${COLORS.grey50};

                &:hover {
                  color: ${COLORS.black90};
                }
              `}
              onClick={() => {
                setSecureLabwareModalType(moduleType)
              }}
            >
              <Flex flexDirection={DIRECTION_ROW} width="15rem">
                <Icon
                  name="information"
                  size="0.75rem"
                  marginTop={SPACING.spacing4}
                  color={COLORS.grey60}
                />
                <StyledText
                  marginLeft={SPACING.spacing4}
                  desktopStyle="bodyDefaultRegular"
                  textDecoration={TYPOGRAPHY.textDecorationUnderline}
                  color={COLORS.grey60}
                >
                  {t('secure_labware_instructions')}
                </StyledText>
              </Flex>
            </Btn>
          )
        }
        break
      case HEATERSHAKER_MODULE_TYPE:
        isHeaterShakerInProtocol = true
        extraAttentionText = (
          <StyledText desktopStyle="bodyDefaultRegular" color={COLORS.grey60}>
            {t('heater_shaker_labware_list_view')}
          </StyledText>
        )
        const matchingHeaterShaker =
          attachedModuleInfo != null &&
          initialLocation !== 'offDeck' &&
          initialLocation !== 'systemLocation' &&
          'moduleId' in initialLocation &&
          attachedModuleInfo[initialLocation.moduleId] != null
            ? attachedModuleInfo[initialLocation.moduleId].attachedModuleMatch
            : null
        if (
          matchingHeaterShaker != null &&
          matchingHeaterShaker.moduleType === HEATERSHAKER_MODULE_TYPE
        ) {
          if (
            (!isLatchClosed &&
              (matchingHeaterShaker.data.labwareLatchStatus === 'idle_closed' ||
                matchingHeaterShaker.data.labwareLatchStatus === 'closing')) ||
            (isLatchClosed &&
              (matchingHeaterShaker.data.labwareLatchStatus === 'idle_open' ||
                matchingHeaterShaker.data.labwareLatchStatus === 'opening'))
          ) {
            setIsLatchClosed(
              matchingHeaterShaker.data.labwareLatchStatus === 'idle_closed' ||
                matchingHeaterShaker.data.labwareLatchStatus === 'closing'
            )
            setIsLatchLoading(false)
          }
          latchCommand = {
            commandType: isLatchClosed
              ? 'heaterShaker/openLabwareLatch'
              : 'heaterShaker/closeLabwareLatch',
            params: { moduleId: matchingHeaterShaker.id },
          }
          //  Labware latch button is disabled unless the correct H-S is attached
          //  this is for MoaM support
          isCorrectHeaterShakerAttached = true
        }
    }
  }
  const toggleLatch = (): void => {
    setIsLatchLoading(true)
    createLiveCommand({
      command: latchCommand,
    }).catch((e: Error) => {
      console.error(
        `error setting module status with command type ${latchCommand.commandType}: ${e.message}`
      )
    })
  }
  const commandType = isLatchClosed
    ? 'heaterShaker/openLabwareLatch'
    : 'heaterShaker/closeLabwareLatch'
  let hsLatchText: string = t('secure')
  if (commandType === 'heaterShaker/closeLabwareLatch' && isLatchLoading) {
    hsLatchText = t('closing')
  } else if (
    commandType === 'heaterShaker/openLabwareLatch' &&
    isLatchLoading
  ) {
    hsLatchText = t('opening')
  }

  return (
    <LabwareRow>
      <Flex alignItems={ALIGN_CENTER} gridGap={SPACING.spacing2} width="5rem">
        {slotInfo != null && isFlex ? (
          <DeckInfoLabel deckLabel={slotInfo} />
        ) : (
          <StyledText
            css={TYPOGRAPHY.pSemiBold}
            data-testid={`slot_info_${slotInfo}`}
          >
            {slotInfo}
          </StyledText>
        )}
        {isStacked ? <DeckInfoLabel iconName="stacked" /> : null}
      </Flex>
      <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing12}>
        <>
          <Flex>
            {showLabwareSVG && topLabwareDefinition != null ? (
              <StandaloneLabware definition={topLabwareDefinition} />
            ) : null}
            <Flex
              flexDirection={DIRECTION_COLUMN}
              justifyContent={JUSTIFY_CENTER}
              marginLeft={SPACING.spacing8}
              marginRight={SPACING.spacing24}
            >
              <StyledText desktopStyle="bodyDefaultSemiBold">
                {labwareName}
              </StyledText>
              <StyledText
                desktopStyle="bodyDefaultRegular"
                color={COLORS.grey60}
              >
                {labwareQuantity > 1
                  ? t('labware_quantity', { quantity: labwareQuantity })
                  : labwareNickname}
              </StyledText>
            </Flex>
          </Flex>
        </>
        {bottomLabwareName != null ? (
          <>
            <Divider marginY="0" />
            <Flex
              flexDirection={DIRECTION_COLUMN}
              justifyContent={JUSTIFY_CENTER}
              marginLeft={SPACING.spacing8}
              marginRight={SPACING.spacing24}
            >
              <StyledText desktopStyle="bodyDefaultSemiBold">
                {bottomLabwareName}
              </StyledText>
              <StyledText
                desktopStyle="bodyDefaultRegular"
                color={COLORS.grey60}
              >
                {bottomLabwareNickname}
              </StyledText>
            </Flex>
          </>
        ) : null}
        {moduleDisplayName != null ? (
          <>
            <Divider marginY="0" />
            <Flex
              justifyContent={JUSTIFY_SPACE_BETWEEN}
              flexDirection={DIRECTION_ROW}
              marginLeft={SPACING.spacing8}
              paddingRight={SPACING.spacing24}
              gridGap={SPACING.spacing8}
            >
              <Flex gridGap={SPACING.spacing12} alignItems={ALIGN_CENTER}>
                {moduleType != null ? (
                  <DeckInfoLabel
                    iconName={MODULE_ICON_NAME_BY_TYPE[moduleType]}
                  />
                ) : null}
                <Flex
                  flexDirection={DIRECTION_COLUMN}
                  justifyContent={JUSTIFY_CENTER}
                >
                  <StyledText desktopStyle="bodyDefaultSemiBold">
                    {moduleDisplayName}
                  </StyledText>
                  {extraAttentionText}
                </Flex>
              </Flex>
              {secureLabwareInstructions}
              {isHeaterShakerInProtocol ? (
                <Flex flexDirection={DIRECTION_COLUMN} width="15rem">
                  <StyledText
                    desktopStyle="bodyDefaultRegular"
                    color={COLORS.grey60}
                    minWidth="6.2rem"
                  >
                    {t('labware_latch')}
                  </StyledText>
                  <Flex
                    flexDirection={DIRECTION_ROW}
                    gridGap={SPACING.spacing4}
                    marginTop="3px"
                  >
                    <ToggleButton
                      label={`heater_shaker_${slotInfo ?? ''}_latch_toggle`}
                      size={SIZE_AUTO}
                      disabled={
                        !isCorrectHeaterShakerAttached || isLatchLoading
                      }
                      toggledOn={isLatchClosed}
                      onClick={toggleLatch}
                      display={DISPLAY_FLEX}
                      alignItems={ALIGN_CENTER}
                    />
                    <StyledText desktopStyle="bodyDefaultRegular" width="4rem">
                      {hsLatchText}
                    </StyledText>
                  </Flex>
                </Flex>
              ) : null}
            </Flex>
          </>
        ) : null}
      </Flex>
      {secureLabwareModalType != null && (
        <SecureLabwareModal
          type={secureLabwareModalType as ModuleTypesThatRequireExtraAttention}
          onCloseClick={() => {
            setSecureLabwareModalType(null)
          }}
        />
      )}
    </LabwareRow>
  )
}

const LabwareThumbnail = styled.svg`
  transform: scale(1, -1);
  width: 4.2rem;
  flex-shrink: 0;
`

function StandaloneLabware(props: {
  definition: LabwareDefinition2
}): JSX.Element {
  const { definition } = props
  return (
    <LabwareThumbnail
      viewBox={`${definition.cornerOffsetFromSlot.x} ${definition.cornerOffsetFromSlot.y} ${definition.dimensions.xDimension} ${definition.dimensions.yDimension}`}
    >
      <LabwareRender
        definition={definition}
        wellLabelOption={WELL_LABEL_OPTIONS.SHOW_LABEL_INSIDE}
      />
    </LabwareThumbnail>
  )
}
