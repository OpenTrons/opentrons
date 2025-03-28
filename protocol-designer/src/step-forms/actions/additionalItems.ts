import { uuid } from '../../utils'

export interface ToggleIsGripperRequiredAction {
  type: 'TOGGLE_IS_GRIPPER_REQUIRED'
  payload: { id: string }
}

export const toggleIsGripperRequired = (
  id?: string
): ToggleIsGripperRequiredAction => ({
  type: 'TOGGLE_IS_GRIPPER_REQUIRED',
  payload: { id: id != null ? id : `${uuid()}:gripper` },
})

export type DeckFixture = 'wasteChute' | 'stagingArea' | 'trashBin'
export interface CreateDeckFixtureAction {
  type: 'CREATE_DECK_FIXTURE'
  payload: {
    name: DeckFixture
    id: string
    location: string
  }
}

export const createDeckFixture = (
  name: DeckFixture,
  location: string
): CreateDeckFixtureAction => ({
  type: 'CREATE_DECK_FIXTURE',
  payload: {
    name,
    id: `${uuid()}:${name}`,
    location,
  },
})

export interface DeleteDeckFixtureAction {
  type: 'DELETE_DECK_FIXTURE'
  payload: {
    id: string
  }
}

export const deleteDeckFixture = (id: string): DeleteDeckFixtureAction => ({
  type: 'DELETE_DECK_FIXTURE',
  payload: {
    id,
  },
})
