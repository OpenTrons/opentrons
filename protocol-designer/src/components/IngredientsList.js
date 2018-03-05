// @flow
import React from 'react'
import get from 'lodash/get'

import {IconButton, SidePanel, TitledList} from '@opentrons/components'
import StepDescription from './StepDescription'
import {swatchColors} from '../constants.js'
import styles from './IngredientsList.css'
import type {Ingredient} from '../labware-ingred/types'

type DeleteIngredient = (args: {wellName: string, groupId: string}) => void // TODO get from action type?
type EditModeIngredientGroup = (args: {groupId: string}) => void

// Props used by both IngredientsList and IngredGroupCard // TODO
type CommonProps = {|
  editModeIngredientGroup: EditModeIngredientGroup,
  deleteIngredient: DeleteIngredient,
  selected?: boolean
|}

type CardProps = {|
  ingredCategoryData: Ingredient,
  ...CommonProps
|}

type CardState = {|
  isExpanded: boolean
|}

class IngredGroupCard extends React.Component<CardProps, CardState> {
  constructor (props: CardProps) {
    super(props)
    this.state = {isExpanded: true} // TODO: rename to 'collapsed'
  }

  toggleAccordion = () => this.setState({isExpanded: !this.state.isExpanded})

  render () {
    const {ingredCategoryData, editModeIngredientGroup, deleteIngredient, selected} = this.props
    const { groupId, serializeName, description } = ingredCategoryData
    const { isExpanded } = this.state

    return (
      <TitledList
        title={ingredCategoryData.name || 'Unnamed Ingredient'}
        className={styles.ingredient_titled_list}
        iconProps={{style: {fill: swatchColors(parseInt(groupId))}}}
        iconName='circle'
        onCollapseToggle={() => this.toggleAccordion()}
        collapsed={!isExpanded}
        selected={selected}
        onClick={() => editModeIngredientGroup({groupId})}
        description={<StepDescription description={description} header='Description:' />}
      >
        <div className={styles.ingredient_row_header}>
          <span>Well</span>
          <span>Volume</span>
          <span>Name</span>
          <span />
        </div>
        {/* TODO Ian 2018-02-21 don't need to typecheck for isArray when Ingredient.wells is standardized */}
        {Array.isArray(ingredCategoryData.wells) && ingredCategoryData.wells.map((wellName, i) =>
          <IngredIndividual key={i}
            name={ingredCategoryData.individualize
              ? get(ingredCategoryData, ['wellDetails', wellName, 'name'], `${serializeName || 'Sample'} ${i + 1}`)
              : ''
            }
            wellName={wellName}
            canDelete
            volume={get(ingredCategoryData, ['wellDetails', wellName, 'volume'], ingredCategoryData.volume)}
            // concentration={get(ingredCategoryData, ['wellDetails', wellName, 'concentration'], ingredCategoryData.concentration)}
            groupId={groupId}
            editModeIngredientGroup={editModeIngredientGroup}
            deleteIngredient={deleteIngredient}
          />
        )}
      </TitledList>
    )
  }
}

type IndividProps = {|
  name: string,
  wellName: string,
  volume: number,
  // concentration?: string,
  canDelete: boolean,
  groupId: string,
  editModeIngredientGroup: EditModeIngredientGroup,
  deleteIngredient: DeleteIngredient
|}

function IngredIndividual (props: IndividProps) {
  const {
    name,
    wellName,
    volume,
    // concentration, // TODO LATER Ian 2018-02-22: concentration is removed from MVP. Remove all traces of it, or add it back in
    canDelete,
    groupId,
    deleteIngredient
  } = props

  return (
    <div
      className={styles.ingredient_row}
    >
      <div>{wellName}</div>
      <div>{volume ? volume + ' μL' : '-'}</div>
      <div>{name}</div>
      {canDelete && <IconButton name='close'
        onClick={
          () => window.confirm(`Are you sure you want to delete well ${wellName} ?`) &&
          deleteIngredient({wellName, groupId})
        } />}
    </div>
  )
}

export type Props = {
  ingredients: Array<Ingredient> | null,
  selectedIngredientGroupId: string | null,
  ...CommonProps
}

export default function IngredientsList (props: Props) {
  const {
    // slot,
    // containerName,
    // containerType,
    ingredients,
    editModeIngredientGroup,
    deleteIngredient,
    selectedIngredientGroupId
  } = props

  return (
    <SidePanel title='Ingredients'>
        {/* <div className={styles.ingred_list_header_label}>
          <div className={styles.flex_row}>
            <div>Slot {slot}</div>
            <div className={styles.container_type}>{humanize(containerType)}</div>
          </div>
          <div className={styles.container_name}>{containerName}</div>
        </div> */}

        {ingredients && ingredients.map((ingredCategoryData, i) =>
          <IngredGroupCard key={i}
            editModeIngredientGroup={editModeIngredientGroup}
            deleteIngredient={deleteIngredient}
            ingredCategoryData={ingredCategoryData}
            selected={selectedIngredientGroupId === ingredCategoryData.groupId}
          />)
        }
    </SidePanel>
  )
}
