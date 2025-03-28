import { useTranslation } from 'react-i18next'
import capitalize from 'lodash/capitalize'
import { LEFT, RIGHT, SINGLE_MOUNT_PIPETTES } from '@opentrons/shared-data'
import { FLOWS } from './constants'
import type { LoadedPipette, PipetteMount } from '@opentrons/shared-data'
import type { AttachedPipettesFromInstrumentsQuery } from '/app/resources/instruments'
import type { PipetteWizardFlow, SelectablePipettes } from './types'

interface PipetteFlowWizardHeaderTextProps {
  flowType: PipetteWizardFlow
  mount: PipetteMount
  selectedPipette: SelectablePipettes
  hasCalData: boolean
  isGantryEmpty: boolean
  attachedPipettes: AttachedPipettesFromInstrumentsQuery
  pipetteInfo: LoadedPipette[] | null
}

export function usePipetteFlowWizardHeaderText(
  props: PipetteFlowWizardHeaderTextProps
): string {
  const {
    flowType,
    mount,
    selectedPipette,
    hasCalData,
    isGantryEmpty,
    attachedPipettes,
    pipetteInfo,
  } = props
  const { t, i18n } = useTranslation('pipette_wizard_flows')

  let wizardTitle: string = 'unknown page'

  const leftPipette = pipetteInfo?.find(pipette => pipette.mount === 'left')
  const mountPipette = pipetteInfo?.find(pipette => pipette.mount === mount)
  const capitalizedMount = capitalize(mount)

  if (pipetteInfo == null) {
    switch (flowType) {
      case FLOWS.CALIBRATE: {
        if (selectedPipette === SINGLE_MOUNT_PIPETTES) {
          wizardTitle = i18n.format(
            t(hasCalData ? 'recalibrate_pipette' : 'calibrate_pipette', {
              mount: mount,
            }),
            'sentenceCase'
          )
        } else {
          wizardTitle = t('calibrate_96_channel')
        }
        break
      }
      case FLOWS.ATTACH: {
        if (selectedPipette === SINGLE_MOUNT_PIPETTES) {
          wizardTitle = i18n.format(
            t('attach_pipette', { mount: mount }),
            'sentenceCase'
          )
        } else {
          wizardTitle = isGantryEmpty
            ? t('attach_96_channel')
            : t('attach_96_channel_plus_detach', {
                pipetteName:
                  attachedPipettes[LEFT]?.displayName ??
                  attachedPipettes[RIGHT]?.displayName,
              })
        }
        break
      }
      case FLOWS.DETACH: {
        if (selectedPipette === SINGLE_MOUNT_PIPETTES) {
          wizardTitle = i18n.format(
            t('detach_pipette', { mount: mount }),
            'sentenceCase'
          )
        } else {
          wizardTitle = t('detach_96_channel')
        }
        break
      }
    }
  } else {
    if (mountPipette?.pipetteName === attachedPipettes[mount]?.instrumentName) {
      return i18n.format(
        t('calibrate_pipette', {
          mount: mount,
        }),
        'sentenceCase'
      )
    } else if (
      attachedPipettes[LEFT]?.data.channels === 96 &&
      mountPipette?.pipetteName !== 'p1000_96' &&
      mountPipette?.pipetteName !== 'p200_96'
    ) {
      return t('detach_96_attach_mount', { mount: capitalizedMount })
    } else if (
      leftPipette?.pipetteName === 'p1000_96' ||
      leftPipette?.pipetteName === 'p200_96'
    ) {
      if (isGantryEmpty) {
        return t('attach_96_channel')
      } else if (
        attachedPipettes[LEFT] != null &&
        attachedPipettes[RIGHT] == null
      ) {
        return t('detach_mount_attach_96', { mount: capitalize(LEFT) })
      } else if (
        attachedPipettes[LEFT] == null &&
        attachedPipettes[RIGHT] != null
      ) {
        return t('detach_mount_attach_96', { mount: capitalize(RIGHT) })
      } else {
        return t('detach_pipettes_attach_96')
      }
    } else if (mountPipette != null && attachedPipettes[mount] == null) {
      return i18n.format(
        t('attach_pipette', { mount: capitalizedMount }),
        'sentenceCase'
      )
    } else if (mountPipette != null && attachedPipettes[mount] != null) {
      return i18n.format(t('replace_pipette', { mount: mount }), 'sentenceCase')
    }
  }
  return wizardTitle
}
