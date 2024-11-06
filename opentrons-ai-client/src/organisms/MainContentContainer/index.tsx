import { useRef, useEffect } from 'react'
import styled from 'styled-components'
import { useAtom } from 'jotai'

import {
  DIRECTION_COLUMN,
  Flex,
  OVERFLOW_AUTO,
  SPACING,
} from '@opentrons/components'
import { PromptGuide } from '../../molecules/PromptGuide'
import { ChatDisplay } from '../../molecules/ChatDisplay'
import { ChatFooter } from '../../molecules/ChatFooter'
import { chatDataAtom } from '../../resources/atoms'

export function MainContentContainer(): JSX.Element {
  const [chatData] = useAtom(chatDataAtom)
  const scrollRef = useRef<HTMLSpanElement | null>(null)

  useEffect(() => {
    if (scrollRef.current != null)
      scrollRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest',
      })
  }, [chatData.length])

  return (
    <Flex
      padding={`${SPACING.spacing40} ${SPACING.spacing40} ${SPACING.spacing24}`}
      flexDirection={DIRECTION_COLUMN}
      gridGap={SPACING.spacing40}
      height="100vh"
      width="100%"
    >
      <Flex
        width="100%"
        overflowY={OVERFLOW_AUTO}
        flexDirection={DIRECTION_COLUMN}
        flexGrow="1"
      >
        <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing12}>
          <PromptGuide />
        </Flex>
        <ChatDataContainer>
          {chatData.length > 0
            ? chatData.map((chat, index) => (
                <ChatDisplay
                  key={`prompt-from_${chat.role}_${index}`}
                  chat={chat}
                  chatId={`${chat.role}_${index}`}
                />
              ))
            : null}
        </ChatDataContainer>
        <span ref={scrollRef} />
      </Flex>
      <Flex bottom="0" zIndex="2" width="100%" flexDirection={DIRECTION_COLUMN}>
        <ChatFooter />
      </Flex>
    </Flex>
  )
}

const ChatDataContainer = styled(Flex)`
  flex-direction: ${DIRECTION_COLUMN};
  width: 100%;
`
