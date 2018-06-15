// @flow
import _ from 'lodash'
import {createSelector} from 'reselect'
import type {BaseState} from '../../types'
import type {RootState} from '../reducers'

export const rootSelector = (state: BaseState): RootState => state.fileData

export const fileFormValues = createSelector(
  rootSelector,
  state => state.unsavedMetadataForm
)

export const isUnsavedMetadatFormAltered = createSelector(
  rootSelector,
  state => !_.isEqual(state.unsavedMetadataForm, state.fileMetadata)
)

export const protocolName = createSelector(rootSelector, state => state.fileMetadata.name)
export const fileMetadata = createSelector(
  rootSelector,
  state => state.fileMetadata
)
