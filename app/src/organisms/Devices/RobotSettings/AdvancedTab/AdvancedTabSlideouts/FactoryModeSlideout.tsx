import * as React from 'react'
import { useDispatch } from 'react-redux'
import { useForm, Controller } from 'react-hook-form'
import { Trans, useTranslation } from 'react-i18next'

import {
  ALIGN_CENTER,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  Link,
  PrimaryButton,
  SPACING,
  StyledText,
  TYPOGRAPHY,
} from '@opentrons/components'
import {
  useCreateSplashMutation,
  useRobotSettingsQuery,
} from '@opentrons/react-api-client'

import { ToggleButton } from '../../../../../atoms/buttons'
import { InputField } from '../../../../../atoms/InputField'
import { MultiSlideout } from '../../../../../atoms/Slideout/MultiSlideout'
import { UploadInput } from '../../../../../molecules/UploadInput'
import { restartRobot } from '../../../../../redux/robot-admin'
import { updateSetting } from '../../../../../redux/robot-settings'

import type { RobotSettingsField } from '@opentrons/api-client'
import type { Dispatch } from '../../../../../redux/types'

interface FactoryModeSlideoutProps {
  isExpanded: boolean
  onCloseClick: () => void
  robotName: string
}

interface FormValues {
  passwordInput: string
}

export function FactoryModeSlideout({
  isExpanded,
  onCloseClick,
  robotName,
}: FactoryModeSlideoutProps): JSX.Element {
  const { t } = useTranslation(['device_settings', 'shared', 'branded'])

  const dispatch = useDispatch<Dispatch>()

  const { createSplash } = useCreateSplashMutation()
  const { settings } = useRobotSettingsQuery().data ?? {}
  const oemModeSetting = (settings ?? []).find(
    (setting: RobotSettingsField) => setting?.id === 'enableOEMMode'
  )
  const isOEMMode = oemModeSetting?.value ?? null

  const [currentStep, setCurrentStep] = React.useState<number>(1)
  const [toggleValue, setToggleValue] = React.useState<boolean>(false)
  const [file, setFile] = React.useState<File | null>(null)

  const {
    handleSubmit,
    control,
    formState: { errors },
    trigger,
  } = useForm({
    defaultValues: {
      passwordInput: '',
    },
  })
  const onSubmit = (data: FormValues): void => {
    setCurrentStep(2)
  }

  const handleSubmitFactoryPassword = (): void => {
    // TODO: validation and errors: PLAT-281
    void handleSubmit(onSubmit)()
  }

  const handleToggleClick: React.MouseEventHandler<Element> = () => {
    setToggleValue(toggleValue => !toggleValue)
  }

  const handleCompleteClick: React.MouseEventHandler<Element> = () => {
    // TODO: loading spinner, wait for update setting response before sending image
    dispatch(updateSetting(robotName, 'enableOEMMode', toggleValue))

    if (toggleValue && file != null) {
      createSplash({ file })
    }

    // TODO: wait for createSplash response before restarting robot and closing slideout
    dispatch(restartRobot(robotName))
    onCloseClick()
  }

  const handleChooseFile = (file: File): void => {
    const imgUrl = URL.createObjectURL(file)
    const logoImage = new Image()
    logoImage.src = imgUrl
    logoImage.onload = () => {
      // validation for ODD screen size and allowed file type
      if (
        logoImage.naturalWidth === 1024 &&
        logoImage.naturalHeight === 600 &&
        file.type === 'image/png'
      ) {
        setFile(file)
      } else {
        // TODO: error handling in file upload component
      }
    }
  }

  React.useEffect(() => {
    // initialize local state to OEM mode value
    if (isOEMMode != null) {
      setToggleValue(isOEMMode)
    }
  }, [isOEMMode])

  return (
    <MultiSlideout
      title={currentStep === 1 ? t('enter_password') : t('manage_oem_settings')}
      maxSteps={2}
      currentStep={currentStep}
      onCloseClick={onCloseClick}
      isExpanded={isExpanded}
      footer={
        <>
          {currentStep === 1 ? (
            <PrimaryButton onClick={handleSubmitFactoryPassword} width="100%">
              {t('shared:next')}
            </PrimaryButton>
          ) : null}
          {currentStep === 2 ? (
            <PrimaryButton
              disabled={toggleValue && file == null}
              onClick={handleCompleteClick}
              width="100%"
            >
              {t('complete_and_restart_robot')}
            </PrimaryButton>
          ) : null}
        </>
      }
    >
      {currentStep === 1 ? (
        <Flex flexDirection={DIRECTION_COLUMN}>
          <Controller
            control={control}
            name="passwordInput"
            render={({ field, fieldState }) => (
              <InputField
                id="passwordInput"
                name="passwordInput"
                type="text"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  field.onChange(e)
                  trigger('passwordInput')
                }}
                value={field.value}
                error={fieldState.error?.message && ' '}
                onBlur={field.onBlur}
                title={t('enter_factory_password')}
              />
            )}
          />
          {errors.passwordInput != null ? (
            <StyledText
              as="label"
              color={COLORS.red50}
              marginTop={SPACING.spacing4}
            >
              {errors.passwordInput.message}
            </StyledText>
          ) : null}
        </Flex>
      ) : null}
      {currentStep === 2 ? (
        <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing24}>
          <Flex flexDirection={DIRECTION_COLUMN}>
            <StyledText
              css={TYPOGRAPHY.pSemiBold}
              paddingBottom={SPACING.spacing4}
            >
              {t('oem_mode')}
            </StyledText>
            <Flex alignItems={ALIGN_CENTER} gridGap={SPACING.spacing6}>
              <ToggleButton
                label="oem_mode_toggle"
                toggledOn={toggleValue}
                onClick={handleToggleClick}
              />
              <StyledText as="p" marginBottom={SPACING.spacing4}>
                {toggleValue ? t('on') : t('off')}
              </StyledText>
            </Flex>
            <StyledText as="p">{t('branded:oem_mode_description')}</StyledText>
          </Flex>
          <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing16}>
            <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing6}>
              <StyledText css={TYPOGRAPHY.pSemiBold}>
                {t('upload_custom_logo')}
              </StyledText>
              <StyledText as="p">
                {t('upload_custom_logo_description')}
              </StyledText>
              <StyledText as="p">
                {t('upload_custom_logo_dimensions')}
              </StyledText>
            </Flex>
            <UploadInput
              uploadButtonText={t('choose_file')}
              onUpload={(file: File) => handleChooseFile(file)}
              dragAndDropText={
                <StyledText as="p">
                  <Trans
                    t={t}
                    i18nKey="shared:drag_and_drop"
                    components={{
                      a: <Link color={COLORS.blue55} role="button" />,
                    }}
                  />
                </StyledText>
              }
            />
          </Flex>
        </Flex>
      ) : null}
    </MultiSlideout>
  )
}
