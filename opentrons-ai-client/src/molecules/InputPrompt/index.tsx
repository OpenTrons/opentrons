import React from 'react'
import { useTranslation } from 'react-i18next'
import styled, { css } from 'styled-components'
import { useForm } from 'react-hook-form'
import { useAtom } from 'jotai'

import {
  ALIGN_CENTER,
  BORDERS,
  COLORS,
  DIRECTION_ROW,
  Flex,
  JUSTIFY_CENTER,
  SPACING,
  TYPOGRAPHY,
} from '@opentrons/components'
import { SendButton } from '../../atoms/SendButton'
import { preparedPromptAtom, chatDataAtom } from '../../resources/atoms'
import { useApiCall, useGetAccessToken } from '../../resources/hooks'
import { calcTextAreaHeight } from '../../resources/utils/utils'
import { END_POINT } from '../../resources/constants'

import type { AxiosRequestConfig } from 'axios'
import type { ChatData } from '../../resources/types'

interface InputType {
  userPrompt: string
}

export function InputPrompt(): JSX.Element {
  const { t } = useTranslation('protocol_generator')
  const { register, watch, setValue, reset } = useForm<InputType>({
    defaultValues: {
      userPrompt: '',
    },
  })
  const [preparedPrompt] = useAtom(preparedPromptAtom)
  const [, setChatData] = useAtom(chatDataAtom)
  const [submitted, setSubmitted] = React.useState<boolean>(false)
  const userPrompt = watch('userPrompt') ?? ''
  const { data, isLoading, callApi } = useApiCall()
  const { getAccessToken } = useGetAccessToken()

  const handleClick = async (): Promise<void> => {
    const userInput: ChatData = {
      role: 'user',
      reply: userPrompt,
    }
    setChatData(chatData => [...chatData, userInput])

    try {
      const accessToken = await getAccessToken()
      const headers = {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      }

      const postData = {
        message: userPrompt,
        fake: false,
      }

      const config = {
        url: END_POINT,
        method: 'POST',
        headers,
        data: postData,
      }
      await callApi(config as AxiosRequestConfig)
      setSubmitted(true)
      reset()
    } catch (err: any) {
      console.error(`error: ${err.message}`)
      throw err
    }
  }

  React.useEffect(() => {
    if (preparedPrompt !== '') setValue('userPrompt', preparedPrompt as string)
  }, [preparedPrompt, setValue])

  React.useEffect(() => {
    if (submitted && data != null && !isLoading) {
      const { role, reply } = data
      const assistantResponse: ChatData = {
        role,
        reply,
      }
      setChatData(chatData => [...chatData, assistantResponse])
      setSubmitted(false)
    }
  }, [data, isLoading, submitted])

  return (
    <StyledForm id="User_Prompt">
      <Flex css={CONTAINER_STYLE}>
        <StyledTextarea
          rows={calcTextAreaHeight(userPrompt)}
          placeholder={t('type_your_prompt')}
          {...register('userPrompt')}
        />
        <SendButton
          disabled={userPrompt.length === 0}
          isLoading={isLoading}
          handleClick={handleClick}
        />
      </Flex>
    </StyledForm>
  )
}

const StyledForm = styled.form`
  width: 100%;
`

const CONTAINER_STYLE = css`
  padding: ${SPACING.spacing40};
  grid-gap: ${SPACING.spacing40};
  flex-direction: ${DIRECTION_ROW};
  background-color: ${COLORS.white};
  border-radius: ${BORDERS.borderRadius4};
  justify-content: ${JUSTIFY_CENTER};
  align-items: ${ALIGN_CENTER};
  max-height: 21.25rem;

  &:focus-within {
    border: 1px ${BORDERS.styleSolid}${COLORS.blue50};
  }
`

const StyledTextarea = styled.textarea`
  resize: none;
  min-height: 3.75rem;
  max-height: 17.25rem;
  overflow-y: auto;
  background-color: ${COLORS.white};
  border: none;
  outline: none;
  padding: 0;
  box-shadow: none;
  color: ${COLORS.black90};
  width: 100%;
  font-size: ${TYPOGRAPHY.fontSize20};
  line-height: ${TYPOGRAPHY.lineHeight24};
  padding: 1.2rem 0;

  ::placeholder {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
  }
`
