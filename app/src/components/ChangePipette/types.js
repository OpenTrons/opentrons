// @flow
import type { PipetteModelSpecs } from '@opentrons/shared-data'
import type { Mount } from '../../robot'

import type { RobotMove, RobotHome } from '../../http-api-client'

import type { PipetteSelectionProps } from './PipetteSelection'

export type Direction = 'attach' | 'detach'

export type ChangePipetteProps = {
  title: string,
  subtitle: string,
  mount: Mount,
  wantedPipetteName: ?string,
  actualPipette: ?PipetteModelSpecs,
  displayName: string,
  direction: Direction,
  success: boolean,
  attachedWrong: boolean,
  parentUrl: string,
  baseUrl: string,
  confirmUrl: string,
  exitUrl: string,
  moveRequest: RobotMove,
  homeRequest: RobotHome,
  back: () => mixed,
  exit: () => mixed,
  moveToFront: () => mixed,
  onPipetteSelect: $PropertyType<PipetteSelectionProps, 'onChange'>,
  checkPipette: () => mixed,
  confirmPipette: () => mixed,
}
