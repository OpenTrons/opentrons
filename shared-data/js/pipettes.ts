import pipetteNameSpecs from '../pipette/definitions/1/pipetteNameSpecs.json'
import pipetteModelSpecs from '../pipette/definitions/1/pipetteModelSpecs.json'
import { OT3_PIPETTES } from './constants'
import type {
  PipetteV2Specs,
  PipetteV2GeneralSpecs,
  PipetteV2GeometrySpecs,
  PipetteV2LiquidSpecs,
  PipetteNameSpecs,
  PipetteModelSpecs,
} from './types'

const generalGeometric = import.meta.glob(
  '../pipette/definitions/2/*/*/*/*.json',
  { eager: true }
)
const liquid = import.meta.glob(
  '../pipette/definitions/2/liquid/*/*/*/*.json',
  { eager: true }
)

type PipChannelString = 'single' | 'multi' | '96'
type Channels = 'eight_channel' | 'single_channel' | 'ninety_six_channel'
type Gen = 'gen1' | 'gen2' | 'gen3' | 'flex'

type CombinedModules =
  | PipetteV2GeneralSpecs
  | PipetteV2GeometrySpecs
  | PipetteV2LiquidSpecs
interface ModuleSpecs {
  default: CombinedModules
}

type SortableProps = 'maxVolume' | 'channels'

// TODO(mc, 2021-04-30): use these types, pulled directly from the JSON,
// to simplify return types in this module and possibly remove some `null`s
export type PipetteName = keyof typeof pipetteNameSpecs
export type PipetteModel = keyof typeof pipetteModelSpecs.config

// models sorted by channels and then volume by default
const ALL_PIPETTE_NAMES: PipetteName[] = (Object.keys(
  pipetteNameSpecs
) as PipetteName[]).sort(comparePipettes(['channels', 'maxVolume']))

// use a name like 'p10_single' to get specs true for all models under that name
export function getPipetteNameSpecs(
  name: PipetteName
): PipetteNameSpecs | null {
  const config = pipetteNameSpecs[name] as
    | Omit<PipetteNameSpecs, 'name'>
    | undefined
  return config != null ? { ...config, name } : null
}

// specify a model, eg 'p10_single_v1.3' to get
// both the name specs + model-specific specs
// NOTE: this should NEVER be used in PD, which is model-agnostic
export function getPipetteModelSpecs(
  model: PipetteModel
): PipetteModelSpecs | null | undefined {
  const modelSpecificFields = pipetteModelSpecs.config[model]
  const modelFields =
    modelSpecificFields &&
    getPipetteNameSpecs(modelSpecificFields.name as PipetteName)
  return modelFields && { ...modelFields, ...modelSpecificFields, model }
}

export function getAllPipetteNames(...sortBy: SortableProps[]): PipetteName[] {
  const models = [...ALL_PIPETTE_NAMES]
  if (sortBy.length) models.sort(comparePipettes(sortBy))
  return models
}

function comparePipettes(sortBy: SortableProps[]) {
  return (modelA: PipetteName, modelB: PipetteName) => {
    // any cast is because we know these pipettes exist
    const a = getPipetteNameSpecs(modelA) as PipetteNameSpecs
    const b = getPipetteNameSpecs(modelB) as PipetteNameSpecs
    let i

    for (i = 0; i < sortBy.length; i++) {
      const sortKey = sortBy[i]
      if (a[sortKey] < b[sortKey]) return -1
      if (a[sortKey] > b[sortKey]) return 1
    }

    return 0
  }
}

export function shouldLevel(specs: PipetteNameSpecs): boolean {
  return specs.displayCategory === 'GEN2' && specs.channels === 8
}

export function isFlexPipette(pipetteName: PipetteName): boolean {
  return (
    OT3_PIPETTES.includes(pipetteName) ||
    getPipetteNameSpecs(pipetteName)?.displayCategory === 'FLEX'
  )
}

export const getIncompatiblePipetteNames = (
  currentPipette: PipetteName
): string[] => {
  if (isFlexPipette(currentPipette)) {
    return getAllPipetteNames().filter(pipette => !isFlexPipette(pipette))
  } else if (
    getPipetteNameSpecs(currentPipette)?.displayCategory === 'GEN1' ||
    getPipetteNameSpecs(currentPipette)?.displayCategory === 'GEN2'
  ) {
    return getAllPipetteNames().filter(pipette => isFlexPipette(pipette))
  } else {
    return []
  }
}

export * from '../pipette/fixtures/name'
const getChannelsFromString = (
  pipChannelString: PipChannelString
): Channels | null => {
  switch (pipChannelString) {
    case 'single': {
      return 'single_channel'
    }
    case 'multi': {
      return 'eight_channel'
    }
    case '96': {
      return 'ninety_six_channel'
    }
    default: {
      console.error(`invalid number of channels from ${pipChannelString}`)
      return null
    }
  }
}
const getVersionFromGen = (gen: Gen): string | null => {
  switch (gen) {
    case 'gen1': {
      return '1_0'
    }
    case 'gen2': {
      return '2_0'
    }
    case 'gen3':
    case 'flex': {
      return '3_0'
    }
    default: {
      return null
    }
  }
}

const V2_DEFINITION_TYPES = ['general', 'geometry', 'liquid']

/* takes in pipetteName such as 'p300_single' or 'p300_single_gen1' 
or PipetteModel such as 'p300_single_v1.3' and converts it to channels,
model, and version from generation in order to return the correct pipette schema v2 json files. 
**/
export const getPipetteSpecsV2 = (
  name: PipetteName | PipetteModel,
  lowVolume: boolean
): PipetteV2Specs | null => {
  const nameSplit = name.split('_')
  const pipetteModel = nameSplit[0] // ex: p300
  const channels = getChannelsFromString(nameSplit[1] as PipChannelString) //  ex: single -> single_channel
  const gen = getVersionFromGen(nameSplit[2] as Gen)

  let version: string
  if (nameSplit.length === 2) {
    version = '1_0'
  } else if (gen != null) {
    version = gen //  ex: gen1 -> 1_0
  } else {
    const versionDot = nameSplit[2].split('v')[1]
    version = versionDot.replace('.', '_') // ex: v1.1 -> 1_1
  }
  const combinedGlobs = {
    ...generalGeometric,
    ...liquid,
  }
  const allJsons = Object.keys(combinedGlobs).map(path => combinedGlobs[path])
  const liquidPath = lowVolume ? 'lowVolumeDefault' : 'default'

  const matchingJsons = allJsons.reduce(
    //  NOTE: combinedModules = array of 3 jsons, module = 1 json
    (combinedModules: CombinedModules[], module: ModuleSpecs, index) => {
      const path = Object.keys(combinedGlobs)[index]
      V2_DEFINITION_TYPES.forEach(type => {
        if (
          (type !== 'liquid' &&
            `../pipette/definitions/2/${type}/${channels}/${pipetteModel}/${version}.json` ===
              path) ||
          (type === 'liquid' &&
            `../pipette/definitions/2/liquid/${channels}/${pipetteModel}/${liquidPath}/${version}.json` ===
              path)
        ) {
          combinedModules.push(module.default)
        }
      })
      return combinedModules
    },
    []
  )

  return Object.assign({}, ...matchingJsons) as PipetteV2Specs
}
