import * as React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Card } from '@opentrons/components'
import {
  MAGNETIC_MODULE_TYPE,
  TEMPERATURE_MODULE_TYPE,
  HEATERSHAKER_MODULE_TYPE,
  ModuleType,
  PipetteName,
  getPipetteNameSpecs,
} from '@opentrons/shared-data'
import {
  selectors as stepFormSelectors,
  getIsCrashablePipetteSelected,
  ModulesForEditModulesCard,
} from '../../step-forms'
import { selectors as featureFlagSelectors } from '../../feature-flags'
import { SUPPORTED_MODULE_TYPES } from '../../modules'
import { getAdditionalEquipment } from '../../step-forms/selectors'
import { toggleIsGripperRequired } from '../../step-forms/actions/additionalItems'
import { getRobotType } from '../../file-data/selectors'
import { CrashInfoBox } from './CrashInfoBox'
import { ModuleRow } from './ModuleRow'
import { GripperRow } from './GripperRow'
import { isModuleWithCollisionIssue } from './utils'
import styles from './styles.css'

export interface Props {
  modules: ModulesForEditModulesCard
  openEditModuleModal: (moduleType: ModuleType, moduleId?: string) => unknown
}

export function EditModulesCard(props: Props): JSX.Element {
  const { modules, openEditModuleModal } = props
  const pipettesByMount = useSelector(
    stepFormSelectors.getPipettesForEditPipetteForm
  )
  const additionalEquipment = useSelector(getAdditionalEquipment)
  const isGripperAttached = Object.values(additionalEquipment).some(
    equipment => equipment?.name === 'gripper'
  )

  const dispatch = useDispatch()
  const robotType = useSelector(getRobotType)

  const magneticModuleOnDeck = modules[MAGNETIC_MODULE_TYPE]
  const temperatureModuleOnDeck = modules[TEMPERATURE_MODULE_TYPE]
  const heaterShakerOnDeck = modules[HEATERSHAKER_MODULE_TYPE]

  const crashablePipetteSelected = getIsCrashablePipetteSelected(
    pipettesByMount
  )
  const hasCrashableMagneticModule =
    magneticModuleOnDeck &&
    isModuleWithCollisionIssue(magneticModuleOnDeck.model)
  const hasCrashableTempModule =
    temperatureModuleOnDeck &&
    isModuleWithCollisionIssue(temperatureModuleOnDeck.model)
  const isHeaterShakerOnDeck = Boolean(heaterShakerOnDeck)

  const showTempPipetteCollisons =
    crashablePipetteSelected && hasCrashableTempModule
  const showMagPipetteCollisons =
    crashablePipetteSelected && hasCrashableMagneticModule

  const moduleRestrictionsDisabled = Boolean(
    useSelector(featureFlagSelectors.getDisableModuleRestrictions)
  )

  const showHeaterShakerPipetteCollisions =
    isHeaterShakerOnDeck &&
    [
      getPipetteNameSpecs(pipettesByMount.left.pipetteName as PipetteName),
      getPipetteNameSpecs(pipettesByMount.right.pipetteName as PipetteName),
    ].some(pipetteSpecs => pipetteSpecs?.channels !== 1)

  const warningsEnabled = !moduleRestrictionsDisabled
  const isOt3 = robotType === 'OT-3 Standard'

  const SUPPORTED_MODULE_TYPES_FILTERED = SUPPORTED_MODULE_TYPES.filter(
    moduleType =>
      isOt3
        ? moduleType !== 'magneticModuleType'
        : moduleType !== 'magneticBlockType'
  )

  const handleGripperClick = (): void => {
    dispatch(toggleIsGripperRequired())
  }
  return (
    <Card title={isOt3 ? 'Additional Items' : 'Modules'}>
      <div className={styles.modules_card_content}>
        {warningsEnabled && !isOt3 && (
          <CrashInfoBox
            showMagPipetteCollisons={showMagPipetteCollisons}
            showTempPipetteCollisons={showTempPipetteCollisons}
            showHeaterShakerLabwareCollisions={isHeaterShakerOnDeck}
            showHeaterShakerModuleCollisions={isHeaterShakerOnDeck}
            showHeaterShakerPipetteCollisions={
              showHeaterShakerPipetteCollisions
            }
          />
        )}
        {SUPPORTED_MODULE_TYPES_FILTERED.map((moduleType, i) => {
          const moduleData = modules[moduleType]
          if (moduleData) {
            return (
              <ModuleRow
                type={moduleType}
                moduleOnDeck={moduleData}
                showCollisionWarnings={warningsEnabled}
                key={i}
                openEditModuleModal={openEditModuleModal}
                isOt3={isOt3}
              />
            )
          } else {
            return (
              <ModuleRow
                type={moduleType}
                key={i}
                openEditModuleModal={openEditModuleModal}
              />
            )
          }
        })}
        {isOt3 ? (
          <GripperRow
            handleGripper={handleGripperClick}
            isGripperAdded={isGripperAttached}
          />
        ) : null}
      </div>
    </Card>
  )
}
