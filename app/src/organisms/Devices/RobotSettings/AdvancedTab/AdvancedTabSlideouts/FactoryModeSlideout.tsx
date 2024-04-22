import * as React from 'react'
import { useDispatch } from 'react-redux'
import { useForm, Controller } from 'react-hook-form'
import { Trans, useTranslation } from 'react-i18next'

import {
  ALIGN_CENTER,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  Icon,
  Link,
  PrimaryButton,
  SPACING,
  StyledText,
  TYPOGRAPHY,
} from '@opentrons/components'
import {
  useCreateSplashMutation,
  useRobotSettingsQuery,
  useUpdateRobotSettingMutation,
} from '@opentrons/react-api-client'

import { ToggleButton } from '../../../../../atoms/buttons'
import { InputField } from '../../../../../atoms/InputField'
import { MultiSlideout } from '../../../../../atoms/Slideout/MultiSlideout'
import { FileUpload } from '../../../../../molecules/FileUpload'
import { UploadInput } from '../../../../../molecules/UploadInput'
import { restartRobot } from '../../../../../redux/robot-admin'

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

  const { settings } = useRobotSettingsQuery().data ?? {}
  const oemModeSetting = (settings ?? []).find(
    (setting: RobotSettingsField) => setting?.id === 'enableOEMMode'
  )
  const isOEMMode = oemModeSetting?.value ?? null

  const [currentStep, setCurrentStep] = React.useState<number>(1)
  const [toggleValue, setToggleValue] = React.useState<boolean>(false)
  const [file, setFile] = React.useState<File | null>(null)
  const [fileError, setFileError] = React.useState<string | null>(null)
  const [isUploading, setIsUploading] = React.useState<boolean>(false)

  const onFinishCompleteClick = (): void => {
    dispatch(restartRobot(robotName))
    onCloseClick()
    setIsUploading(false)
  }

  const { createSplash } = useCreateSplashMutation({
    onSuccess: () => {
      onFinishCompleteClick()
    },
  })

  const { updateRobotSetting } = useUpdateRobotSettingMutation({
    onSuccess: () => {
      if (toggleValue && file != null) {
        createSplash({ file })
      } else {
        onFinishCompleteClick()
      }
    },
  })

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
    setIsUploading(true)
    updateRobotSetting({ id: 'enableOEMMode', value: toggleValue })
  }

  const handleChooseFile = (file: File): void => {
    // validation for file type
    if (file.type !== 'image/png') {
      setFileError('Incorrect file type')
      setFile(file)
    } else {
      const imgUrl = URL.createObjectURL(file)
      const logoImage = new Image()
      logoImage.src = imgUrl
      logoImage.onload = () => {
        // validation for ODD screen size
        if (
          logoImage.naturalWidth !== 1024 ||
          logoImage.naturalHeight !== 600
        ) {
          setFileError('Incorrect image dimensions')
        }
        setFile(file)
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
              disabled={
                (toggleValue && file == null) ||
                isUploading ||
                fileError != null
              }
              onClick={handleCompleteClick}
              width="100%"
            >
              {isUploading ? (
                <Icon name="ot-spinner" spin size="1rem" />
              ) : (
                t('complete_and_restart_robot')
              )}
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
          {toggleValue ? (
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
              {file == null ? (
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
              ) : (
                <FileUpload
                  file={file}
                  fileError={fileError}
                  handleClick={() => {
                    setFile(null)
                    setFileError(null)
                  }}
                />
              )}
            </Flex>
          ) : null}
        </Flex>
      ) : null}
    </MultiSlideout>
  )
}
