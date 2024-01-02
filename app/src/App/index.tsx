import * as React from 'react'
import { useSelector } from 'react-redux'
import { hot } from 'react-hot-loader/root'
import mqtt from 'mqtt'

import { Flex, POSITION_FIXED, DIRECTION_ROW } from '@opentrons/components'

import { GlobalStyle } from '../atoms/GlobalStyle'
import { getConfig, getIsOnDevice } from '../redux/config'
import { DesktopApp } from './DesktopApp'
import { OnDeviceDisplayApp } from './OnDeviceDisplayApp'
import { TopPortalRoot } from './portal'

const stopEvent = (event: React.MouseEvent): void => event.preventDefault()

export const AppComponent = (): JSX.Element | null => {
  const hasConfigLoaded = useSelector(getConfig) != null
  const isOnDevice = useSelector(getIsOnDevice)

  React.useEffect(() => {
    const client = mqtt.connect('ws://broker.emqx.io:8083/mqtt', {
      clientId: 'emqx_test7526',
      username: 'emqx2',
      password: '**********',
    })

    client.on('connect', function () {
      console.log('HITTING CONNECT BLOCK')
      client.subscribe('opentrons/test', function (err) {
        if (err == null) {
          console.log('PUBLISHING MESSAGE')
          client.publish(
            'opentrons/test',
            JSON.stringify({
              content: 'Hello world!',
            })
          )
        } else {
          console.log('ERROR')
          console.log(err)
        }
      })
    })

    client.on('message', function (topic, message) {
      // message is Buffer
      console.log(message.toString())
    })

    return () => {
      client.end()
    }
  }, [])
  // render null until getIsOnDevice returns the isOnDevice value from config
  return hasConfigLoaded ? (
    <>
      <GlobalStyle isOnDevice={isOnDevice} />
      <Flex
        position={POSITION_FIXED}
        flexDirection={DIRECTION_ROW}
        width="100%"
        height="100vh"
        onDragOver={stopEvent}
        onDrop={stopEvent}
      >
        <TopPortalRoot />
        {isOnDevice ? <OnDeviceDisplayApp /> : <DesktopApp />}
      </Flex>
    </>
  ) : null
}

export const App = hot(AppComponent)
