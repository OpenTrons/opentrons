import * as React from 'react'
import { useTranslation } from 'react-i18next'
import styled, { css } from 'styled-components'

import {
  ALIGN_CENTER,
  BORDERS,
  Btn,
  LocationIcon,
  COLORS,
  DIRECTION_COLUMN,
  DIRECTION_ROW,
  DISPLAY_FLEX,
  Flex,
  Icon,
  JUSTIFY_CENTER,
  JUSTIFY_SPACE_BETWEEN,
  MODULE_ICON_NAME_BY_TYPE,
  LabwareRender,
  SIZE_AUTO,
  SPACING,
  StyledText,
  TYPOGRAPHY,
  WELL_LABEL_OPTIONS,
} from '@opentrons/components'
import { useCreateLiveCommandMutation } from '@opentrons/react-api-client'
import {
  getLabwareDisplayName,
  getModuleDisplayName,
  getModuleType,
  HEATERSHAKER_MODULE_TYPE,
  MAGNETIC_MODULE_TYPE,
  TC_MODULE_LOCATION_OT2,
  TC_MODULE_LOCATION_OT3,
  THERMOCYCLER_MODULE_TYPE,
  THERMOCYCLER_MODULE_V2,
} from '@opentrons/shared-data'

import { ToggleButton } from '../../../../atoms/buttons'
import { Divider } from '../../../../atoms/structure'
import { SecureLabwareModal } from './SecureLabwareModal'

import type {
  HeaterShakerCloseLatchCreateCommand,
  HeaterShakerOpenLatchCreateCommand,
  RunTimeCommand,
  ModuleType,
  LabwareDefinition2,
  LoadModuleRunTimeCommand,
  LoadLabwareRunTimeCommand,
} from '@opentrons/shared-data'
import type { ModuleRenderInfoForProtocol } from '../../hooks'
import type { LabwareSetupItem } from '../../../../pages/Protocols/utils'
import type { ModuleTypesThatRequireExtraAttention } from '../utils/getModuleTypesThatRequireExtraAttention'
import type { NestedLabwareInfo } from './getNestedLabwareInfo'

const LabwareRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 6fr 5.9fr;
  border-style: ${BORDERS.styleSolid};
  border-width: 1px;
  border-color: ${COLORS.grey30};
  border-radius: ${BORDERS.borderRadius4};
  padding: ${(SPACING.spacing12,
  SPACING.spacing16,
  SPACING.spacing12,
  SPACING.spacing24)};
`

interface LabwareListItemProps extends LabwareSetupItem {
  attachedModuleInfo: { [moduleId: string]: ModuleRenderInfoForProtocol }
  extraAttentionModules: ModuleTypesThatRequireExtraAttention[]
  isFlex: boolean
  commands: RunTimeCommand[]
  nestedLabwareInfo: NestedLabwareInfo | null
  showLabwareSVG?: boolean
}

export function LabwareListItem(
  props: LabwareListItemProps
): JSX.Element | null {
  const {
    attachedModuleInfo,
    nickName,
    initialLocation,
    definition,
    moduleModel,
    moduleLocation,
    extraAttentionModules,
    isFlex,
    commands,
    nestedLabwareInfo,
    showLabwareSVG,
  } = props
  const { i18n, t } = useTranslation('protocol_setup')
  const [
    secureLabwareModalType,
    setSecureLabwareModalType,
  ] = React.useState<ModuleType | null>(null)
  const labwareDisplayName = getLabwareDisplayName(definition)
  const { createLiveCommand } = useCreateLiveCommandMutation()
  const [isLatchLoading, setIsLatchLoading] = React.useState<boolean>(false)
  const [isLatchClosed, setIsLatchClosed] = React.useState<boolean>(false)

  let slotInfo: string | null = null

  if (initialLocation !== 'offDeck' && 'slotName' in initialLocation) {
    slotInfo = initialLocation.slotName
  } else if (
    initialLocation !== 'offDeck' &&
    'addressableAreaName' in initialLocation
  ) {
    slotInfo = initialLocation.addressableAreaName
  } else if (initialLocation === 'offDeck') {
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

  if (initialLocation !== 'offDeck' && 'labwareId' in initialLocation) {
    const loadedAdapter = commands.find(
      (command): command is LoadLabwareRunTimeCommand =>
        command.commandType === 'loadLabware' &&
        command.result?.labwareId === initialLocation.labwareId
    )
    const loadedAdapterLocation = loadedAdapter?.params.location

    if (loadedAdapterLocation != null && loadedAdapterLocation !== 'offDeck') {
      if ('slotName' in loadedAdapterLocation) {
        slotInfo = loadedAdapterLocation.slotName
      } else if ('moduleId' in loadedAdapterLocation) {
        const module = commands.find(
          (command): command is LoadModuleRunTimeCommand =>
            command.commandType === 'loadModule' &&
            command.result?.moduleId === loadedAdapterLocation.moduleId
        )
        if (module != null) {
          slotInfo = module.params.location.slotName
          moduleDisplayName = getModuleDisplayName(module.params.model)
        }
      }
    }
  }
  if (
    initialLocation !== 'offDeck' &&
    'moduleId' in initialLocation &&
    moduleLocation != null &&
    moduleModel != null
  ) {
    const moduleName = getModuleDisplayName(moduleModel)
    moduleType = getModuleType(moduleModel)
    const moduleTypeNeedsAttention = extraAttentionModules.find(
      extraAttentionModType => extraAttentionModType === moduleType
    )
    let moduleSlotName = moduleLocation.slotName
    if (moduleType === THERMOCYCLER_MODULE_TYPE) {
      moduleSlotName = isFlex ? TC_MODULE_LOCATION_OT3 : TC_MODULE_LOCATION_OT2
    }
    slotInfo = moduleSlotName
    moduleDisplayName = moduleName
    switch (moduleTypeNeedsAttention) {
      case MAGNETIC_MODULE_TYPE:
      case THERMOCYCLER_MODULE_TYPE:
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
      <Flex alignItems={ALIGN_CENTER} width="80px" gridGap={SPACING.spacing2}>
        {slotInfo != null && isFlex ? (
          <LocationIcon slotName={slotInfo} />
        ) : (
          <StyledText
            css={TYPOGRAPHY.pSemiBold}
            data-testid={`slot_info_${slotInfo}`}
          >
            {slotInfo}
          </StyledText>
        )}
        {nestedLabwareInfo != null || moduleDisplayName != null ? (
          <LocationIcon iconName="stacked" />
        ) : null}
      </Flex>
      <Flex
        flexDirection={DIRECTION_COLUMN}
        gridGap={SPACING.spacing16}
        width="45.875rem"
      >
        <Flex>
          {showLabwareSVG && <StandaloneLabware definition={definition} />}
          <Flex
            flexDirection={DIRECTION_COLUMN}
            justifyContent={JUSTIFY_CENTER}
            marginLeft={SPACING.spacing8}
            marginRight={SPACING.spacing24}
          >
            <StyledText desktopStyle="bodyDefaultSemiBold">
              {labwareDisplayName}
            </StyledText>
            <StyledText desktopStyle="bodyDefaultRegular" color={COLORS.grey60}>
              {nickName}
            </StyledText>
          </Flex>
        </Flex>
        {nestedLabwareInfo != null &&
        nestedLabwareInfo?.sharedSlotId === slotInfo ? (
          <>
            <Divider />
            <Flex>
              <Flex
                flexDirection={DIRECTION_COLUMN}
                justifyContent={JUSTIFY_CENTER}
                marginLeft={SPACING.spacing8}
                marginRight={SPACING.spacing24}
              >
                <StyledText desktopStyle="bodyDefaultSemiBold">
                  {nestedLabwareInfo.nestedLabwareDisplayName}
                </StyledText>
                <StyledText
                  desktopStyle="bodyDefaultRegular"
                  color={COLORS.grey60}
                >
                  {nestedLabwareInfo.nestedLabwareNickName}
                </StyledText>
              </Flex>
            </Flex>
          </>
        ) : null}
        {moduleDisplayName != null ? (
          <>
            <Divider />
            <Flex
              justifyContent={JUSTIFY_SPACE_BETWEEN}
              flexDirection={DIRECTION_ROW}
              marginLeft={SPACING.spacing8}
              paddingRight={SPACING.spacing24}
              gridGap={SPACING.spacing8}
            >
              <Flex gridGap={SPACING.spacing12} alignItems={ALIGN_CENTER}>
                {moduleType != null ? (
                  <LocationIcon
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
                      label={`heater_shaker_${
                        moduleLocation?.slotName ?? ''
                      }_latch_toggle`}
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
