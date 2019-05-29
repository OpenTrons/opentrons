// @flow
// filter helpers
import queryString from 'query-string'
import flatMap from 'lodash/flatMap'
import pickBy from 'lodash/pickBy'
import uniq from 'lodash/uniq'

import { getAllDefinitions } from './definitions'
import { getPublicPath } from './public-path'

import type { Location } from 'react-router-dom'
import type { FilterParams, LabwareDefinition, LabwareList } from './types'

export const FILTER_OFF = 'all'

export function getAllCategories(): Array<string> {
  const categories = getAllDefinitions().map(d => d.metadata.displayCategory)

  return [FILTER_OFF].concat(uniq(categories))
}

export function getAllManufacturers(): Array<string> {
  const definitions = getAllDefinitions()
  const brands = definitions.map(d => d.brand.brand)
  const wellGroupBrands = flatMap<LabwareDefinition, string>(
    definitions,
    (d: LabwareDefinition, i: number, c: LabwareList) =>
      d.groups.map(g => g.brand?.brand).filter(Boolean)
  )

  return uniq([FILTER_OFF, ...brands, ...wellGroupBrands])
}

export function getFilters(
  location: Location,
  definition: LabwareDefinition | null
): FilterParams {
  if (definition) {
    return {
      category: definition.metadata.displayCategory,
      manufacturer: definition.brand.brand,
    }
  }

  const queryParams = queryString.parse(location.search)
  const category = queryParams.category || FILTER_OFF
  const manufacturer = queryParams.manufacturer || FILTER_OFF

  return { category, manufacturer }
}

export function buildFiltersUrl(filters: FilterParams): string {
  const params = pickBy(filters, v => v !== FILTER_OFF)

  return `${getPublicPath()}?${queryString.stringify(params)}`
}

export function getFilteredDefinitions(filters: FilterParams): LabwareList {
  return getAllDefinitions().filter(
    def =>
      testCategory(filters.category, def) &&
      testManufacturer(filters.manufacturer, def)
  )
}

export function testManufacturer(
  manufacturer: ?string,
  definition: LabwareDefinition
): boolean {
  return (
    !manufacturer ||
    manufacturer === FILTER_OFF ||
    manufacturer === definition.brand.brand ||
    definition.groups.some(g => g.brand?.brand === manufacturer)
  )
}

export function testCategory(
  category: ?string,
  definition: LabwareDefinition
): boolean {
  return (
    !category ||
    category === FILTER_OFF ||
    category === definition.metadata.displayCategory
  )
}
