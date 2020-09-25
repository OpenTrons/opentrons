// @flow
// Pipette Offset Calibration Orchestration Component
import * as React from 'react'

import { getPipetteModelSpecs } from '@opentrons/shared-data'
import {
  ModalPage,
  SpinnerModalPage,
  useConditionalConfirm,
  DISPLAY_FLEX,
  DIRECTION_COLUMN,
  ALIGN_CENTER,
  JUSTIFY_CENTER,
  SPACING_3,
  C_TRANSPARENT,
  ALIGN_FLEX_START,
  C_WHITE,
} from '@opentrons/components'

import * as Sessions from '../../sessions'
import {
  Introduction,
  DeckSetup,
  TipPickUp,
  TipConfirmation,
  SaveZPoint,
  SaveXYPoint,
  CompleteConfirmation,
  ConfirmExitModal,
  MeasureNozzle,
  MeasureTip,
} from '../CalibrationPanels'

import type { StyleProps } from '@opentrons/components'
import type {
  DeckCalibrationLabware,
  SessionCommandParams,
} from '../../sessions/types'
import type { CalibratePipetteOffsetParentProps } from './types'
import type { CalibrationPanelProps } from '../CalibrationPanels/types'

const PIPETTE_OFFSET_CALIBRATION_SUBTITLE = 'Pipette offset calibration'
const EXIT = 'exit'

const darkContentsStyleProps = {
  display: DISPLAY_FLEX,
  flexDirection: DIRECTION_COLUMN,
  alignItems: ALIGN_CENTER,
  padding: SPACING_3,
  backgroundColor: C_TRANSPARENT,
  height: '100%',
}
const contentsStyleProps = {
  display: DISPLAY_FLEX,
  backgroundColor: C_WHITE,
  flexDirection: DIRECTION_COLUMN,
  justifyContent: JUSTIFY_CENTER,
  alignItems: ALIGN_FLEX_START,
  padding: SPACING_3,
  maxWidth: '48rem',
  minHeight: '14rem',
}

const terminalContentsStyleProps = {
  ...contentsStyleProps,
  paddingX: '1.5rem',
}

const PANEL_BY_STEP: {
  [string]: React.ComponentType<CalibrationPanelProps>,
} = {
  [Sessions.PIP_OFFSET_STEP_SESSION_STARTED]: Introduction,
  [Sessions.PIP_OFFSET_STEP_LABWARE_LOADED]: DeckSetup,
  [Sessions.PIP_OFFSET_STEP_MEASURING_NOZZLE_OFFSET]: MeasureNozzle,
  [Sessions.PIP_OFFSET_STEP_MEASURING_TIP_OFFSET]: MeasureTip,
  [Sessions.PIP_OFFSET_STEP_PREPARING_PIPETTE]: TipPickUp,
  [Sessions.PIP_OFFSET_STEP_INSPECTING_TIP]: TipConfirmation,
  [Sessions.PIP_OFFSET_STEP_JOGGING_TO_DECK]: SaveZPoint,
  [Sessions.PIP_OFFSET_STEP_SAVING_POINT_ONE]: SaveXYPoint,
  [Sessions.PIP_OFFSET_STEP_CALIBRATION_COMPLETE]: CompleteConfirmation,
}

const PANEL_STYLE_PROPS_BY_STEP: {
  [string]: StyleProps,
} = {
  [Sessions.PIP_OFFSET_STEP_SESSION_STARTED]: terminalContentsStyleProps,
  [Sessions.PIP_OFFSET_STEP_LABWARE_LOADED]: darkContentsStyleProps,
  [Sessions.PIP_OFFSET_STEP_PREPARING_PIPETTE]: contentsStyleProps,
  [Sessions.PIP_OFFSET_STEP_INSPECTING_TIP]: contentsStyleProps,
  [Sessions.PIP_OFFSET_STEP_JOGGING_TO_DECK]: contentsStyleProps,
  [Sessions.PIP_OFFSET_STEP_SAVING_POINT_ONE]: contentsStyleProps,
  [Sessions.PIP_OFFSET_STEP_CALIBRATION_COMPLETE]: terminalContentsStyleProps,
}
export function CalibratePipetteOffset(
  props: CalibratePipetteOffsetParentProps
): React.Node {
  const {
    session,
    robotName,
    closeWizard,
    dispatchRequests,
    showSpinner,
  } = props
  const { currentStep, instrument, labware } = session?.details || {}

  const {
    showConfirmation: showConfirmExit,
    confirm: confirmExit,
    cancel: cancelExit,
  } = useConditionalConfirm(() => {
    cleanUpAndExit()
  }, true)

  const isMulti = React.useMemo(() => {
    const spec = instrument && getPipetteModelSpecs(instrument.model)
    return spec ? spec.channels > 1 : false
  }, [instrument])

  function sendCommands(...commands: Array<SessionCommandParams>) {
    if (session?.id) {
      const sessionCommandActions = commands.map(c =>
        Sessions.createSessionCommand(robotName, session.id, {
          command: c.command,
          data: c.data || {},
        })
      )
      dispatchRequests(...sessionCommandActions)
    }
  }

  function cleanUpAndExit() {
    if (session?.id) {
      dispatchRequests(
        Sessions.createSessionCommand(robotName, session.id, {
          command: Sessions.sharedCalCommands.EXIT,
          data: {},
        }),
        Sessions.deleteSession(robotName, session.id)
      )
    }
    closeWizard()
  }

  const tipRack: DeckCalibrationLabware | null =
    (labware && labware.find(l => l.isTiprack)) ?? null

  if (!session || !tipRack) {
    return null
  }

  const titleBarProps = {
    title: PIPETTE_OFFSET_CALIBRATION_SUBTITLE,
    back: { onClick: confirmExit, title: EXIT, children: EXIT },
  }

  if (showSpinner) {
    return <SpinnerModalPage titleBar={titleBarProps} />
  }

  const Panel = PANEL_BY_STEP[currentStep]
  return Panel ? (
    <>
      <ModalPage
        titleBar={titleBarProps}
        innerProps={PANEL_STYLE_PROPS_BY_STEP[currentStep]}
      >
        <Panel
          sendCommands={sendCommands}
          cleanUpAndExit={cleanUpAndExit}
          tipRack={tipRack}
          isMulti={isMulti}
          mount={instrument?.mount.toLowerCase()}
          currentStep={currentStep}
          sessionType={session.sessionType}
          hasCalibratedTipLength={session.details.hasCalibratedTipLength}
        />
      </ModalPage>
      {showConfirmExit && (
        <ConfirmExitModal
          exit={confirmExit}
          back={cancelExit}
          sessionType={session.sessionType}
        />
      )}
    </>
  ) : null
}
