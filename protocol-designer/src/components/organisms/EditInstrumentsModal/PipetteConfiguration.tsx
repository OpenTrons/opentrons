import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import styled from 'styled-components'

import {
  ALIGN_CENTER,
  ALIGN_STRETCH,
  Box,
  Btn,
  Checkbox,
  COLORS,
  CURSOR_POINTER,
  DIRECTION_COLUMN,
  DISPLAY_FLEX,
  DISPLAY_INLINE_BLOCK,
  FLEX_MAX_CONTENT,
  Flex,
  OVERFLOW_AUTO,
  PRODUCT,
  RadioButton,
  SPACING,
  StyledText,
  TYPOGRAPHY,
  WRAP,
} from '@opentrons/components'
import {
  FLEX_ROBOT_TYPE,
  getAllPipetteNames,
  OT2_ROBOT_TYPE,
} from '@opentrons/shared-data'

import { getLabwareDefsByURI } from '../../../labware-defs/selectors'
import { getAllowAllTipracks } from '../../../feature-flags/selectors'
import { setFeatureFlags } from '../../../feature-flags/actions'
import { createCustomTiprackDef } from '../../../labware-defs/actions'
import { getShouldShowPipetteType, getTiprackOptions } from './utils'
import { removeOpentronsPhrases } from '../../../utils'
import {
  PIPETTE_GENS,
  PIPETTE_TYPES,
  PIPETTE_VOLUMES,
} from '../../../pages/CreateNewProtocolWizard/constants'

import type { PipetteName, RobotType } from '@opentrons/shared-data'
import type { PipetteOnDeck } from '../../../step-forms'
import type {
  Gen,
  PipetteInfoByGen,
  PipetteInfoByType,
  PipetteType,
} from '../../../pages/CreateNewProtocolWizard/types'
import type { ThunkDispatch } from '../../../types'
import type { PipetteConfig } from './usePipetteConfig'

interface PipetteConfigurationProps {
  has96Channel: boolean
  robotType: RobotType
  selectedPipette: string
  pipetteConfig: PipetteConfig
  leftPipette?: PipetteOnDeck
  rightPipette?: PipetteOnDeck
}

export function PipetteConfiguration({
  has96Channel,
  robotType,
  selectedPipette,
  pipetteConfig,
  leftPipette,
  rightPipette,
}: PipetteConfigurationProps): JSX.Element {
  const { t } = useTranslation(['create_new_protocol', 'shared'])
  const dispatch = useDispatch<ThunkDispatch<any>>()
  const allLabware = useSelector(getLabwareDefsByURI)
  const allowAllTipracks = useSelector(getAllowAllTipracks)
  const allPipetteOptions = getAllPipetteNames('maxVolume', 'channels')
  const {
    mount,
    pipetteType,
    setPipetteType,
    pipetteGen,
    setPipetteGen,
    pipetteVolume,
    setPipetteVolume,
    selectedTips,
    setSelectedTips,
  } = pipetteConfig

  return (
    <Flex
      flexDirection="column"
      overflowY={OVERFLOW_AUTO}
      gridGap={SPACING.spacing24}
    >
      <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing8}>
        <StyledText desktopStyle="bodyLargeSemiBold">
          {t('pipette_type')}
        </StyledText>
        <Flex gridGap={SPACING.spacing4}>
          {PIPETTE_TYPES[robotType].map(type => {
            return getShouldShowPipetteType(
              type.value as PipetteType,
              has96Channel,
              leftPipette,
              rightPipette,
              mount
            ) ? (
              <RadioButton
                key={`${type.label}_${type.value}`}
                onChange={() => {
                  setPipetteType(type.value)
                  setPipetteGen('flex')
                  setPipetteVolume(null)
                  setSelectedTips([])
                }}
                buttonLabel={t(`shared:${type.label}`)}
                buttonValue="single"
                isSelected={pipetteType === type.value}
              />
            ) : null
          })}
        </Flex>
      </Flex>
      {pipetteType != null && robotType === OT2_ROBOT_TYPE ? (
        <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing8}>
          <StyledText desktopStyle="bodyLargeSemiBold">
            {t('pipette_gen')}
          </StyledText>
          <Flex gridGap={SPACING.spacing4}>
            {PIPETTE_GENS.map(gen => (
              <RadioButton
                key={gen}
                onChange={() => {
                  setPipetteGen(gen)
                  setPipetteVolume(null)
                  setSelectedTips([])
                }}
                buttonLabel={gen}
                buttonValue={gen}
                isSelected={pipetteGen === gen}
              />
            ))}
          </Flex>
        </Flex>
      ) : null}
      {(pipetteType != null && robotType === FLEX_ROBOT_TYPE) ||
      (pipetteGen !== 'flex' &&
        pipetteType != null &&
        robotType === OT2_ROBOT_TYPE) ? (
        <Flex
          flexDirection={DIRECTION_COLUMN}
          gridGap={SPACING.spacing8}
          id="volume"
        >
          <StyledText desktopStyle="bodyLargeSemiBold">
            {t('pipette_vol')}
          </StyledText>
          <Flex gridGap={SPACING.spacing4}>
            {PIPETTE_VOLUMES[robotType]?.map(volume => {
              if (robotType === FLEX_ROBOT_TYPE && pipetteType != null) {
                const flexVolume = volume as PipetteInfoByType
                const flexPipetteInfo = flexVolume[pipetteType]

                return flexPipetteInfo?.map(type => (
                  <RadioButton
                    key={`${type.value}_${pipetteType}`}
                    onChange={() => {
                      setPipetteVolume(type.value)
                      setSelectedTips([])
                    }}
                    buttonLabel={t('vol_label', { volume: type.label })}
                    buttonValue={type.value}
                    isSelected={pipetteVolume === type.value}
                  />
                ))
              } else {
                const ot2Volume = volume as PipetteInfoByGen
                const gen = pipetteGen as Gen

                return ot2Volume[gen].map(info => {
                  return info[pipetteType]?.map(type => (
                    <RadioButton
                      key={`${type.value}_${pipetteGen}_${pipetteType}`}
                      onChange={() => {
                        setPipetteVolume(type.value)
                      }}
                      buttonLabel={t('vol_label', {
                        volume: type.label,
                      })}
                      buttonValue={type.value}
                      isSelected={pipetteVolume === type.value}
                    />
                  ))
                })
              }
            })}
          </Flex>
        </Flex>
      ) : null}
      {allPipetteOptions.includes(selectedPipette as PipetteName)
        ? (() => {
            const tiprackOptions = getTiprackOptions({
              allLabware,
              allowAllTipracks,
              selectedPipetteName: selectedPipette,
            })
            return (
              <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing8}>
                <StyledText desktopStyle="bodyLargeSemiBold">
                  {t('pipette_tips')}
                </StyledText>
                <StyledBox>
                  {tiprackOptions.map(option => (
                    <Checkbox
                      key={option.value}
                      disabled={
                        selectedTips.length === 3 &&
                        !selectedTips.includes(option.value)
                      }
                      isChecked={selectedTips.includes(option.value)}
                      labelText={removeOpentronsPhrases(option.name)}
                      onClick={() => {
                        const updatedTips = selectedTips.includes(option.value)
                          ? selectedTips.filter(v => v !== option.value)
                          : [...selectedTips, option.value]
                        setSelectedTips(updatedTips)
                      }}
                    />
                  ))}
                  <Flex
                    gridGap={SPACING.spacing8}
                    padding={SPACING.spacing4}
                    width={FLEX_MAX_CONTENT}
                  >
                    <StyledLabel>
                      <StyledText desktopStyle="bodyDefaultRegular">
                        {t('add_custom_tips')}
                      </StyledText>
                      <input
                        data-testid="SelectPipettes_customTipInput"
                        type="file"
                        onChange={e => dispatch(createCustomTiprackDef(e))}
                      />
                    </StyledLabel>
                    {pipetteVolume === 'p1000' &&
                    robotType === FLEX_ROBOT_TYPE ? null : (
                      <Btn
                        onClick={() => {
                          dispatch(
                            setFeatureFlags({
                              OT_PD_ALLOW_ALL_TIPRACKS: !allowAllTipracks,
                            })
                          )
                        }}
                        textDecoration={TYPOGRAPHY.textDecorationUnderline}
                      >
                        <StyledLabel>
                          <StyledText desktopStyle="bodyDefaultRegular">
                            {allowAllTipracks
                              ? t('show_default_tips')
                              : t('show_all_tips')}
                          </StyledText>
                        </StyledLabel>
                      </Btn>
                    )}
                  </Flex>
                </StyledBox>
              </Flex>
            )
          })()
        : null}
    </Flex>
  )
}

const StyledBox = styled(Box)`
  gap: ${SPACING.spacing4};
  display: ${DISPLAY_FLEX};
  flex-wrap: ${WRAP};
  align-items: ${ALIGN_CENTER};
  align-content: ${ALIGN_CENTER};
  align-self: ${ALIGN_STRETCH};
`

const StyledLabel = styled.label`
  text-decoration: ${TYPOGRAPHY.textDecorationUnderline};
  font-size: ${PRODUCT.TYPOGRAPHY.fontSizeBodyDefaultSemiBold};
  display: ${DISPLAY_INLINE_BLOCK};
  cursor: ${CURSOR_POINTER};
  input[type='file'] {
    display: none;
  }
  &:hover {
    color: ${COLORS.blue50};
  }
`
