// @flow
import * as React from 'react'
import startCase from 'lodash/startCase'
import reduce from 'lodash/reduce'
import {
  useOnClickOutside,
  CheckboxField,
  Icon,
  OutlineButton,
} from '@opentrons/components'
import {
  getLabwareDefURI,
  getLabwareDefIsStandard,
  TEMPERATURE_MODULE_TYPE,
  MAGNETIC_MODULE_TYPE,
  THERMOCYCLER_MODULE_TYPE,
  type LabwareDefinition2,
  type ModuleRealType,
} from '@opentrons/shared-data'
import { i18n } from '../../localization'
import { SPAN7_8_10_11_SLOT } from '../../constants'
import { getLabwareIsCompatible as _getLabwareIsCompatible } from '../../utils/labwareModuleCompatibility'
import { getOnlyLatestDefs } from '../../labware-defs/utils'
import { Portal } from '../portals/TopPortal'
import { PDTitledList } from '../lists'
import { useBlockingHint } from '../Hints/useBlockingHint'
import { KnowledgeBaseLink } from '../KnowledgeBaseLink'
import { LabwareItem } from './LabwareItem'
import { LabwarePreview } from './LabwarePreview'
import styles from './styles.css'
import type { DeckSlot } from '../../types'
import type { LabwareDefByDefURI } from '../../labware-defs'

type Props = {|
  onClose: (e?: any) => mixed,
  onUploadLabware: (event: SyntheticInputEvent<HTMLInputElement>) => mixed,
  selectLabware: (containerType: string) => mixed,
  customLabwareDefs: LabwareDefByDefURI,
  /** the slot you're literally adding labware to (may be a module slot) */
  slot: ?DeckSlot,
  /** if adding to a module, the slot of the parent (for display) */
  parentSlot: ?DeckSlot,
  /** if adding to a module, the module's type */
  moduleType: ?ModuleRealType,
  /** tipracks that may be added to deck (depends on pipette<>tiprack assignment) */
  permittedTipracks: Array<string>,
|}

const LABWARE_CREATOR_URL = 'https://labware.opentrons.com/create'
const CUSTOM_CATEGORY = 'custom'

const orderedCategories: Array<string> = [
  'tipRack',
  'tubeRack',
  'wellPlate',
  'reservoir',
  'aluminumBlock',
  // 'trash', // NOTE: trash intentionally hidden
]

const RECOMMENDED_LABWARE_BY_MODULE: { [ModuleRealType]: Array<string> } = {
  [TEMPERATURE_MODULE_TYPE]: [
    'opentrons_24_aluminumblock_generic_2ml_screwcap',
    'opentrons_96_aluminumblock_biorad_wellplate_200ul',
    'opentrons_96_aluminumblock_generic_pcr_strip_200ul',
    'opentrons_24_aluminumblock_nest_1.5ml_screwcap',
    'opentrons_24_aluminumblock_nest_1.5ml_snapcap',
    'opentrons_24_aluminumblock_nest_2ml_screwcap',
    'opentrons_24_aluminumblock_nest_2ml_snapcap',
    'opentrons_24_aluminumblock_nest_0.5ml_screwcap',
    'opentrons_96_aluminumblock_nest_wellplate_100ul',
  ],
  [MAGNETIC_MODULE_TYPE]: ['nest_96_wellplate_100ul_pcr_full_skirt'],
  [THERMOCYCLER_MODULE_TYPE]: ['nest_96_wellplate_100ul_pcr_full_skirt'],
}

export const getLabwareIsRecommended = (
  def: LabwareDefinition2,
  moduleType: ?ModuleRealType
): boolean =>
  moduleType
    ? RECOMMENDED_LABWARE_BY_MODULE[moduleType].includes(
        def.parameters.loadName
      )
    : false

export const LabwareSelectionModal = (props: Props): React.Node => {
  const {
    customLabwareDefs,
    permittedTipracks,
    onClose,
    onUploadLabware,
    slot,
    parentSlot,
    moduleType,
    selectLabware,
  } = props

  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(
    null
  )
  const [
    previewedLabware,
    setPreviewedLabware,
  ] = React.useState<?LabwareDefinition2>(null)
  const [filterRecommended, setFilterRecommended] = React.useState<boolean>(
    false
  )
  const [enqueuedLabwareType, setEnqueuedLabwareType] = React.useState<
    string | null
  >(null)
  const blockingCustomLabwareHint = useBlockingHint({
    enabled: enqueuedLabwareType !== null,
    hintKey: 'custom_labware_with_modules',
    content: <p>{i18n.t(`alert.hint.custom_labware_with_modules.body`)}</p>,
    handleCancel: () => setEnqueuedLabwareType(null),
    handleContinue: () => {
      setEnqueuedLabwareType(null)
      if (enqueuedLabwareType !== null) {
        // NOTE: this needs to be wrapped for Flow, IRL we know enqueuedLabwareType is not null
        // because `enabled` prop above ensures it's !== null.
        selectLabware(enqueuedLabwareType)
      } else {
        console.error(
          'could not select labware because enqueuedLabwareType is null. This should not happen'
        )
      }
    },
  })

  const handleSelectCustomLabware = React.useCallback(
    (containerType: string) => {
      if (moduleType == null) {
        selectLabware(containerType)
      } else {
        // show the BlockingHint
        setEnqueuedLabwareType(containerType)
      }
    },
    [moduleType, selectLabware, setEnqueuedLabwareType]
  )

  // if you're adding labware to a module, check the recommended filter by default
  React.useEffect(() => {
    setFilterRecommended(moduleType != null)
  }, [moduleType])

  const getLabwareCompatible = React.useCallback(
    (def: LabwareDefinition2) => {
      // assume that custom (non-standard) labware is (potentially) compatible
      if (moduleType == null || !getLabwareDefIsStandard(def)) {
        return true
      }
      return _getLabwareIsCompatible(def, moduleType)
    },
    [moduleType]
  )

  const getLabwareDisabled = React.useCallback(
    (labwareDef: LabwareDefinition2) =>
      (filterRecommended && !getLabwareIsRecommended(labwareDef, moduleType)) ||
      !getLabwareCompatible(labwareDef),
    [filterRecommended, getLabwareCompatible, moduleType]
  )

  const customLabwareURIs: Array<string> = React.useMemo(
    () => Object.keys(customLabwareDefs),
    [customLabwareDefs]
  )

  const labwareByCategory = React.useMemo(() => {
    const defs = getOnlyLatestDefs()
    return reduce<
      LabwareDefByDefURI,
      { [category: string]: Array<LabwareDefinition2> }
    >(
      defs,
      (acc, def: $Values<typeof defs>) => {
        const category: string = def.metadata.displayCategory
        // filter out non-permitted tipracks
        if (
          category === 'tipRack' &&
          !permittedTipracks.includes(getLabwareDefURI(def))
        ) {
          return acc
        }

        return {
          ...acc,
          [category]: [...(acc[category] || []), def],
        }
      },
      {}
    )
  }, [permittedTipracks])

  const populatedCategories: { [category: string]: boolean } = React.useMemo(
    () =>
      orderedCategories.reduce(
        (acc, category) =>
          labwareByCategory[category]
            ? {
                ...acc,
                [category]: labwareByCategory[category].some(
                  def => !getLabwareDisabled(def)
                ),
              }
            : acc,
        {}
      ),
    [labwareByCategory, getLabwareDisabled]
  )

  const wrapperRef = useOnClickOutside({
    onClickOutside: () => {
      // don't close when clicking on the custom labware hint
      if (!enqueuedLabwareType) {
        onClose()
      }
    },
  })

  // do not render without a slot
  if (!slot) return null

  const makeToggleCategory = (category: string) => () => {
    setSelectedCategory(selectedCategory === category ? null : category)
  }

  const recommendedFilterCheckbox = moduleType ? (
    <div>
      <div className={styles.filters_heading}>Filters</div>
      <div className={styles.filters_section}>
        <CheckboxField
          className={styles.filter_checkbox}
          onChange={e => setFilterRecommended(e.currentTarget.checked)}
          value={filterRecommended}
        />
        <Icon className={styles.icon} name="check-decagram" />
        <span className={styles.filters_section_copy}>
          {i18n.t('modal.labware_selection.recommended_labware_filter')}{' '}
          <KnowledgeBaseLink className={styles.link} to="recommendedLabware">
            here
          </KnowledgeBaseLink>
          .
        </span>
      </div>
    </div>
  ) : null

  let moduleCompatibility: $PropertyType<
    React.ElementProps<typeof LabwarePreview>,
    'moduleCompatibility'
  > = null
  if (previewedLabware && moduleType) {
    if (getLabwareIsRecommended(previewedLabware, moduleType)) {
      moduleCompatibility = 'recommended'
    } else if (getLabwareCompatible(previewedLabware)) {
      moduleCompatibility = 'potentiallyCompatible'
    } else {
      moduleCompatibility = 'notCompatible'
    }
  }

  return (
    <>
      <Portal>
        <LabwarePreview
          labwareDef={previewedLabware}
          moduleCompatibility={moduleCompatibility}
        />
      </Portal>
      {blockingCustomLabwareHint}
      <div ref={wrapperRef} className={styles.labware_dropdown}>
        <div className={styles.title}>
          {parentSlot != null && moduleType != null
            ? `Slot ${
                parentSlot === SPAN7_8_10_11_SLOT ? '7' : parentSlot
              }, ${i18n.t(`modules.module_long_names.${moduleType}`)} Labware`
            : `Slot ${slot} Labware`}
        </div>
        {recommendedFilterCheckbox}
        <ul>
          {customLabwareURIs.length > 0 ? (
            <PDTitledList
              title="Custom Labware"
              collapsed={selectedCategory !== CUSTOM_CATEGORY}
              onCollapseToggle={makeToggleCategory(CUSTOM_CATEGORY)}
              onClick={makeToggleCategory(CUSTOM_CATEGORY)}
            >
              {customLabwareURIs.map((labwareURI, index) => (
                <LabwareItem
                  key={index}
                  labwareDef={customLabwareDefs[labwareURI]}
                  selectLabware={handleSelectCustomLabware}
                  onMouseEnter={() =>
                    setPreviewedLabware(customLabwareDefs[labwareURI])
                  }
                  onMouseLeave={() => setPreviewedLabware()}
                />
              ))}
            </PDTitledList>
          ) : null}
          {orderedCategories.map(category => {
            const isPopulated = populatedCategories[category]
            if (isPopulated) {
              return (
                <PDTitledList
                  key={category}
                  title={startCase(category)}
                  collapsed={selectedCategory !== category}
                  onCollapseToggle={makeToggleCategory(category)}
                  onClick={makeToggleCategory(category)}
                  inert={!isPopulated}
                >
                  {labwareByCategory[category] &&
                    labwareByCategory[category].map((labwareDef, index) => {
                      const isDisabled = getLabwareDisabled(labwareDef)
                      if (!isDisabled) {
                        return (
                          <LabwareItem
                            key={index}
                            icon={
                              getLabwareIsRecommended(labwareDef, moduleType)
                                ? 'check-decagram'
                                : null
                            }
                            disabled={isDisabled}
                            labwareDef={labwareDef}
                            selectLabware={selectLabware}
                            onMouseEnter={() => setPreviewedLabware(labwareDef)}
                            onMouseLeave={() => setPreviewedLabware()}
                          />
                        )
                      }
                    })}
                </PDTitledList>
              )
            }
          })}
        </ul>

        <OutlineButton Component="label" className={styles.upload_button}>
          {i18n.t('button.upload_custom_labware')}
          <input
            type="file"
            onChange={e => {
              onUploadLabware(e)
              setSelectedCategory(CUSTOM_CATEGORY)
            }}
          />
        </OutlineButton>
        <div className={styles.upload_helper_copy}>
          {i18n.t('modal.labware_selection.creating_labware_defs')}{' '}
          {/* TODO: Ian 2019-10-15 use LinkOut component once it's in components library, see Opentrons/opentrons#4229 */}
          <a
            className={styles.link}
            href={LABWARE_CREATOR_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            here
          </a>
          .
        </div>

        <OutlineButton onClick={onClose}>
          {i18n.t('button.close')}
        </OutlineButton>
      </div>
    </>
  )
}
