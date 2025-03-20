import { useSelector } from 'react-redux'
import { Trans, useTranslation } from 'react-i18next'
import {
  ALIGN_CENTER,
  ALIGN_FLEX_END,
  DIRECTION_COLUMN,
  FLEX_MAX_CONTENT,
  Flex,
  ListItem,
  SPACING,
  StyledText,
  Tag,
} from '@opentrons/components'
import { getSavedStepForms } from '../../../../step-forms/selectors'

import type { ProfileStepItem } from '../../../../form-types'
import type { ThermocyclerCycleType } from '../StepForm/StepTools/ThermocyclerTools/ThermocyclerCycle'
import type { ThermocyclerStepType } from '../StepForm/StepTools/ThermocyclerTools/ThermocyclerStep'

interface ThermocyclerProfileSubstepsProps {
  stepId: string
}
export function ThermocyclerProfileSubsteps(
  props: ThermocyclerProfileSubstepsProps
): JSX.Element {
  const { stepId } = props

  const { t } = useTranslation('protocol_steps')

  const savedStepForms = useSelector(getSavedStepForms)
  const step = savedStepForms[stepId]
  const orderedSubsteps = step.orderedProfileItems.map(
    (id: string) => step.profileItemsById[id]
  )

  return (
    <Flex
      flexDirection={DIRECTION_COLUMN}
      gridGap={SPACING.spacing4}
      width={FLEX_MAX_CONTENT}
    >
      {orderedSubsteps.map(
        (substep: ThermocyclerStepType | ThermocyclerCycleType) => {
          const content =
            substep.type === 'profileCycle' ? (
              <Flex
                flexDirection={DIRECTION_COLUMN}
                gridGap={SPACING.spacing12}
              >
                {substep.steps.map((profileStep: ProfileStepItem) => {
                  const {
                    temperature,
                    durationMinutes,
                    durationSeconds,
                  } = profileStep
                  return (
                    <ThermocyclerSubstep
                      key={profileStep.id}
                      temperature={temperature}
                      duration={`${durationMinutes}:${durationSeconds}`}
                    />
                  )
                })}
                <StyledText
                  desktopStyle="bodyDefaultRegular"
                  alignSelf={ALIGN_FLEX_END}
                >
                  {t('thermocycler_module.repeat', {
                    repetitions: substep.repetitions,
                  })}
                </StyledText>
              </Flex>
            ) : (
              <ThermocyclerSubstep
                temperature={substep.temperature}
                duration={`${substep.durationMinutes}:${substep.durationSeconds}`}
              />
            )
          return (
            <ListItem
              key={substep.id}
              type="default"
              width="100%"
              padding={SPACING.spacing12}
            >
              {content}
            </ListItem>
          )
        }
      )}
    </Flex>
  )
}

interface ThermocyclerSubstepProps {
  temperature: string
  duration: string
}

function ThermocyclerSubstep(props: ThermocyclerSubstepProps): JSX.Element {
  const { temperature, duration } = props
  const { t } = useTranslation(['application', 'protocol_steps'])
  return (
    <Flex gridGap={SPACING.spacing4} alignItems={ALIGN_CENTER}>
      <Trans
        t={t}
        i18nKey="protocol_steps:thermocycler_module.substep_settings"
        components={{
          text: <StyledText desktopStyle="bodyDefaultRegular" />,
          tagTemperature: (
            <Tag
              type="default"
              text={`${temperature}${t('application:units.degrees')}`}
            />
          ),
          tagDuration: <Tag type="default" text={duration} />,
        }}
      />
    </Flex>
  )
}
