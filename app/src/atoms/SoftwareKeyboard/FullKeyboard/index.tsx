import * as React from 'react'
import Keyboard from 'react-simple-keyboard'
import { customDisplay, fullKeyboardLayout } from '../constants'

interface FullKeyboardProps {
  onChange: (input: string) => void
  keyboardRef: React.MutableRefObject<any>
}

export function FullKeyboard({
  onChange,
  keyboardRef,
}: FullKeyboardProps): JSX.Element {
  const [layoutName, setLayoutName] = React.useState<string>('default')
  const handleShift = (button: string): void => {
    switch (button) {
      case '{shift}':
        setLayoutName(layoutName === 'default' ? 'shift' : 'default')
        break
      case '{numbers}':
        setLayoutName('numbers')
        break
      case '{symbols}':
        setLayoutName('symbols')
        break
      case '{abc}':
        setLayoutName('default')
        break
      default:
        break
    }
  }

  const onKeyPress = (button: string): void => {
    if (
      button === '{numbers}' ||
      button === '{abc}' ||
      button === '{shift}' ||
      button === '{symbols}'
    )
      handleShift(button)
  }

  return (
    <Keyboard
      keyboardRef={r => (keyboardRef.current = r)}
      theme={'hg-theme-default oddTheme1'}
      onChange={onChange}
      onKeyPress={onKeyPress}
      layoutName={layoutName}
      layout={fullKeyboardLayout}
      display={customDisplay}
      mergeDisplay={true}
      autoUseTouchEvents={true}
      useButtonTag={true}
    />
  )
}
