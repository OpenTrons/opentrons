import {
  getLabwareDisplayName,
  getPipetteSpecsV2,
} from '@opentrons/shared-data'
import type { PipetteName } from '@opentrons/shared-data'
import { OTHER } from '../../organisms/ApplicationSection'
import {
  TWO_PIPETTES,
  OPENTRONS_OT2,
  OPENTRONS_FLEX,
  FLEX_GRIPPER,
  NO_PIPETTES,
} from '../../organisms/InstrumentsSection'
import type { UseFormWatch } from 'react-hook-form'
import type { CreateProtocolFormData } from '../../pages/CreateProtocol'
import { getOnlyLatestDefs } from './labware'
import type { CreatePrompt } from '../types'

export function generatePromptPreviewApplicationItems(
  watch: UseFormWatch<CreateProtocolFormData>,
  t: any
): string[] {
  const {
    application: { scientificApplication, otherApplication, description },
  } = watch()

  const scientificOrOtherApplication =
    scientificApplication === OTHER
      ? otherApplication
      : scientificApplication !== ''
      ? t(scientificApplication)
      : ''

  return [
    scientificOrOtherApplication !== '' && scientificOrOtherApplication,
    description !== '' && description,
  ].filter(Boolean)
}

export function generatePromptPreviewInstrumentItems(
  watch: UseFormWatch<CreateProtocolFormData>,
  t: any
): string[] {
  const {
    instruments: { robot, pipettes, leftPipette, rightPipette, flexGripper },
  } = watch()

  const items = []

  robot !== '' && items.push(t(robot))

  if (pipettes === TWO_PIPETTES || robot === OPENTRONS_OT2) {
    leftPipette !== '' &&
      leftPipette !== NO_PIPETTES &&
      items.push(getPipetteSpecsV2(leftPipette as PipetteName)?.displayName)

    rightPipette !== '' &&
      rightPipette !== NO_PIPETTES &&
      items.push(getPipetteSpecsV2(rightPipette as PipetteName)?.displayName)
  } else {
    items.push(pipettes !== '' && t(pipettes))
  }

  if (robot === OPENTRONS_FLEX && flexGripper === FLEX_GRIPPER) {
    items.push(t(flexGripper))
  }

  return items.filter(Boolean)
}

export function generatePromptPreviewModulesItems(
  watch: UseFormWatch<CreateProtocolFormData>,
  t: any
): string[] {
  const { modules } = watch()

  if (modules === undefined || modules?.length === 0) return []

  const items = modules?.map(module =>
    module.adapter === undefined || module.adapter?.name === ''
      ? module.name
      : `${module.name} with ${module.adapter.name}`
  )

  return items.filter(Boolean)
}

export function generatePromptPreviewLabwareLiquidsItems(
  watch: UseFormWatch<CreateProtocolFormData>,
  t: any
): string[] {
  const { labwares, liquids } = watch()

  const items: string[] = []
  const defs = getOnlyLatestDefs()

  // Add all labware items
  labwares?.forEach(labware => {
    items.push(
      `${labware.count} x ${
        getLabwareDisplayName(defs[labware.labwareURI]) as string
      }`
    )
  })

  // Only add liquids if there are any
  if (liquids && liquids.length > 0 && liquids.some(liquid => liquid.trim() !== '')) {
    // Add a special item that will force a line break by taking up 100% width
    items.push('__LINE_BREAK__');
    
    // Add all liquid items
    liquids.forEach(liquid => {
      if (liquid.trim() !== '') {
        items.push(liquid);
      }
    })
  }

  return items.filter(Boolean)
}

export function generatePromptPreviewStepsItems(
  watch: UseFormWatch<CreateProtocolFormData>,
  t: any
): string[] {
  const { steps } = watch()

  if (steps === undefined || steps?.length === 0) return []
  
  if (typeof steps === 'string') {
    // If string is empty, return empty array
    if (steps.trim() === '') return []
    
    // Split the string by line
    const lines = steps.split('\n');
    const result: string[] = [];
    let currentStep = '';
    let isFirstLineInCurrentStep = true;
    let lastLineWasNumberedStep = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check if this line starts a new numbered step (like "1." or "2)")
      const isNumberedStep = /^\d+[.)]/.test(line);
      
      // Check if this line is a bullet point
      const isBulletPoint = /^[-*•]/.test(line);
      
      // A new step starts if:
      // 1. It's a numbered step OR
      // 2. It's a bullet point that's not immediately after a numbered step OR
      // 3. It's the first line
      const isNewStepLine = (
        isNumberedStep || 
        (isBulletPoint && !lastLineWasNumberedStep) ||
        (i === 0 && line !== '')
      );
      
      // Update tracking for whether the last line was a numbered step
      // This helps us keep dashed points with their parent numbered step
      if (isNumberedStep) {
        lastLineWasNumberedStep = true;
      } else if (!isBulletPoint) {
        lastLineWasNumberedStep = false;
      }
      
      // If empty line and we have content, finalize current step
      if (line === '' && currentStep !== '') {
        result.push(currentStep.trim());
        currentStep = '';
        isFirstLineInCurrentStep = true;
        lastLineWasNumberedStep = false;
        continue;
      }
      
      // Skip empty lines otherwise
      if (line === '') continue;
      
      // Start a new step or add to current step
      if (isNewStepLine) {
        // If we already have content, push it as a completed step
        if (currentStep !== '') {
          result.push(currentStep.trim());
        }
        currentStep = line;
        isFirstLineInCurrentStep = false;
      } else {
        // This is a continuation of the current step (created with Shift+Enter)
        // Add a line break to preserve formatting
        if (!isFirstLineInCurrentStep) {
          currentStep += '\n' + line;
        } else {
          currentStep += line;
          isFirstLineInCurrentStep = false;
        }
      }
    }
    
    // Add the last step if there's content
    if (currentStep.trim() !== '') {
      result.push(currentStep.trim());
    }
    
    return result;
  }

  return steps.filter(Boolean)
}

export function generatePromptPreviewData(
  watch: UseFormWatch<CreateProtocolFormData>,
  t: any
): Array<{
  title: string
  items: string[]
}> {
  return [
    {
      title: t('application_title'),
      items: generatePromptPreviewApplicationItems(watch, t),
    },
    {
      title: t('instruments_title'),
      items: generatePromptPreviewInstrumentItems(watch, t),
    },
    {
      title: t('modules_title'),
      items: generatePromptPreviewModulesItems(watch, t),
    },
    {
      title: t('labware_liquids_title'),
      items: generatePromptPreviewLabwareLiquidsItems(watch, t),
    },
    {
      title: t('steps_title'),
      items: generatePromptPreviewStepsItems(watch, t),
    },
  ]
}

export function generateChatPrompt(
  values: CreateProtocolFormData,
  t: any,
  setCreateProtocolChatAtom: (
    args_0: CreatePrompt | ((prev: CreatePrompt) => CreatePrompt)
  ) => void
): string {
  const defs = getOnlyLatestDefs()

  const robotType = t(values.instruments.robot)
  const scientificApplication = `- ${t(
    values.application.scientificApplication
  )}`
  const description = `- ${values.application.description}`
  const pipetteMounts =
    values.instruments.pipettes === TWO_PIPETTES
      ? [
          values.instruments.leftPipette !== NO_PIPETTES &&
            `- ${
              getPipetteSpecsV2(values.instruments.leftPipette as PipetteName)
                ?.displayName
            } ${t('mounted_left')}`,
          values.instruments.rightPipette !== NO_PIPETTES &&
            `- ${
              getPipetteSpecsV2(values.instruments.rightPipette as PipetteName)
                ?.displayName
            } ${t('mounted_right')}`,
        ]
          .filter(Boolean)
          .join('\n')
      : `- ${t(values.instruments.pipettes)}`
  const flexGripper =
    values.instruments.flexGripper === FLEX_GRIPPER &&
    values.instruments.robot === OPENTRONS_FLEX
      ? `\n- ${t('with_flex_gripper')}`
      : ''
  const modules = values.modules
    .map(
      module =>
        `- ${module.name}${
          module.adapter?.name != null ? ` with ${module.adapter.name}` : ''
        }`
    )
    .join('\n')
  const labwares = values.labwares
    .map(
      labware =>
        `- ${getLabwareDisplayName(defs[labware.labwareURI])} x ${
          labware.count
        }`
    )
    .join('\n')
  const liquids = values.liquids.map(liquid => `- ${liquid}`).join('\n')
  const steps = Array.isArray(values.steps)
    ? values.steps.map(step => `- ${step}`).join('\n')
    : values.steps

  const prompt = `${t('create_protocol_prompt_robot', { robotType })}\n${t(
    'application_title'
  )}:\n${scientificApplication}\n\n${t('description')}:\n${description}\n\n${t(
    'pipette_mounts'
  )}:\n\n${pipetteMounts}${flexGripper}\n\n${t(
    'modules_title'
  )}:\n${modules}\n\n${t('labware_section_title')}:\n${labwares}\n\n${t(
    'liquid_section_title'
  )}:\n${liquids}\n\n${t('steps_section_title')}:\n${steps}\n`

  const mounts: string[] =
    values.instruments.pipettes === TWO_PIPETTES
      ? [
          values.instruments.leftPipette !== NO_PIPETTES
            ? `left pipette ${values.instruments.leftPipette}`
            : '',
          values.instruments.rightPipette !== NO_PIPETTES
            ? `right pipette ${values.instruments.rightPipette}`
            : '',
        ].filter(Boolean)
      : [values.instruments.pipettes]

  setCreateProtocolChatAtom({
    prompt,
    regenerate: false,
    scientific_application_type:
      values.application.scientificApplication === OTHER
        ? values.application.otherApplication
        : values.application.scientificApplication,
    description,
    robots: values.instruments.robot,
    mounts,
    flexGripper: values.instruments.flexGripper === FLEX_GRIPPER,
    modules: values.modules.map(
      module =>
        `${module.model}${
          module.adapter?.name != null
            ? `, adapter ${module.adapter?.value}`
            : ''
        }`
    ),
    labware: values.labwares.map(
      labware => `${labware.labwareURI}, quantity: ${labware.count}`
    ),
    liquids: values.liquids,
    steps: Array.isArray(values.steps) ? values.steps : [values.steps],
    fake: false,
    fake_id: 0,
  })

  return prompt
}