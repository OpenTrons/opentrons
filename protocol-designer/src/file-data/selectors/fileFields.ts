import { createSelector } from 'reselect'
import type { BaseState, Selector } from '/protocol-designer/types'
import type { RootState } from '../reducers'
import type { FileMetadataFields } from '../types'
import type { RobotType } from '@opentrons/shared-data'
import type { DesignerTabPayload } from '../actions'

export const rootSelector = (state: BaseState): RootState => state.fileData
export const getCurrentProtocolExists: Selector<boolean> = createSelector(
  rootSelector,
  rootState => rootState.currentProtocolExists
)
export const protocolName: Selector<
  FileMetadataFields['protocolName']
> = createSelector(rootSelector, state => state.fileMetadata.protocolName)
export const getFileMetadata: Selector<FileMetadataFields> = createSelector(
  rootSelector,
  state => state.fileMetadata
)

export const getRobotType: Selector<RobotType> = createSelector(
  rootSelector,
  state => state.robotType
)

export const getDesignerTab: Selector<
  DesignerTabPayload['tab']
> = createSelector(rootSelector, state => state.designerTab)
