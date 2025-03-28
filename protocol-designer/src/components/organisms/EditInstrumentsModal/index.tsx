import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { createPortal } from 'react-dom'

import {
  Flex,
  JUSTIFY_END,
  Modal,
  PrimaryButton,
  SecondaryButton,
  SPACING,
} from '@opentrons/components'

import {
  getAdditionalEquipment,
  getInitialDeckSetup,
  getPipetteEntities,
} from '../../../step-forms/selectors'
import { getHas96Channel } from '../../../utils'
import { getRobotType } from '../../../file-data/selectors'
import { selectors as stepFormSelectors } from '../../../step-forms'
import { getMainPagePortalEl } from '../Portal'
import { editPipettes } from './editPipettes'
import { HandleEnter } from '../../atoms'
import { PipetteOverview } from './PipetteOverview'
import { PipetteConfiguration } from './PipetteConfiguration'
import { usePipetteConfig } from './usePipetteConfig'

import type { PipetteName } from '@opentrons/shared-data'
import type { ThunkDispatch } from '../../../types'

interface EditInstrumentsModalProps {
  onClose: () => void
}

export function EditInstrumentsModal(
  props: EditInstrumentsModalProps
): JSX.Element {
  const { onClose } = props
  const dispatch = useDispatch<ThunkDispatch<any>>()
  const { t } = useTranslation('shared')
  const pipetteConfig = usePipetteConfig()
  const robotType = useSelector(getRobotType)
  const orderedStepIds = useSelector(stepFormSelectors.getOrderedStepIds)
  const initialDeckSetup = useSelector(getInitialDeckSetup)
  const additionalEquipment = useSelector(getAdditionalEquipment)
  const pipetteEntities = useSelector(getPipetteEntities)
  const { pipettes, labware } = initialDeckSetup
  const pipettesOnDeck = Object.values(pipettes)
  const has96Channel = getHas96Channel(pipetteEntities)
  const leftPipette = pipettesOnDeck.find(pipette => pipette.mount === 'left')
  const rightPipette = pipettesOnDeck.find(pipette => pipette.mount === 'right')
  const gripper = Object.values(additionalEquipment).find(
    ae => ae.name === 'gripper'
  )
  const {
    page,
    mount,
    pipetteType,
    pipetteGen,
    pipetteVolume,
    selectedTips,
    setPage,
    resetFields,
  } = pipetteConfig

  const selectedPipette =
    pipetteType === '96' || pipetteGen === 'GEN1'
      ? `${pipetteVolume}_${pipetteType}`
      : `${pipetteVolume}_${pipetteType}_${pipetteGen.toLowerCase()}`

  const handleOnSave = (): void => {
    if (page === 'overview') {
      onClose()
    } else {
      setPage('overview')
      editPipettes(
        labware,
        pipettes,
        orderedStepIds,
        dispatch,
        mount,
        selectedPipette as PipetteName,
        selectedTips,
        leftPipette,
        rightPipette
      )
    }
  }

  return createPortal(
    <HandleEnter onEnter={handleOnSave}>
      <Modal
        marginLeft="0"
        title={page === 'add' ? t('edit_pipette') : t('edit_instruments')}
        type="info"
        closeOnOutsideClick
        width="37.125rem"
        onClose={() => {
          resetFields()
          onClose()
        }}
        footer={
          <Flex
            justifyContent={JUSTIFY_END}
            gridGap={SPACING.spacing8}
            padding={`0 ${SPACING.spacing24} ${SPACING.spacing24}`}
          >
            <SecondaryButton
              onClick={() => {
                if (page === 'overview') {
                  onClose()
                } else {
                  setPage('overview')
                  resetFields()
                }
              }}
            >
              {page === 'overview' ? t('cancel') : t('back')}
            </SecondaryButton>
            <PrimaryButton
              disabled={
                (page === 'add' &&
                  (pipetteVolume == null ||
                    pipetteType == null ||
                    pipetteGen == null ||
                    selectedTips.length === 0)) ||
                (page === 'overview' && pipettesOnDeck.length === 0)
              }
              onClick={handleOnSave}
            >
              {t('save')}
            </PrimaryButton>
          </Flex>
        }
      >
        {page === 'overview' ? (
          <PipetteOverview
            has96Channel={has96Channel}
            labware={labware}
            pipettes={pipettes}
            robotType={robotType}
            leftPipette={leftPipette}
            rightPipette={rightPipette}
            gripper={gripper}
            pipetteConfig={pipetteConfig}
          />
        ) : (
          <PipetteConfiguration
            has96Channel={has96Channel}
            robotType={robotType}
            selectedPipette={selectedPipette}
            leftPipette={leftPipette}
            rightPipette={rightPipette}
            pipetteConfig={pipetteConfig}
          />
        )}
      </Modal>
    </HandleEnter>,
    getMainPagePortalEl()
  )
}
