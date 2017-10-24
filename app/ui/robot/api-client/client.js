// robot api client
// takes a dispatch (send) function and returns a receive handler
import {push} from 'react-router-redux'

import RpcClient from '../../../rpc/client'
import {actions, actionTypes} from '../actions'
import {constants, selectors} from '../reducer'

// TODO(mc, 2017-08-29): don't hardcode this URL
const URL = 'ws://127.0.0.1:31950'
const RUN_TIME_TICK_INTERVAL_MS = 200

const NO_INTERVAL = -1
const RE_VOLUME = /.*?(\d+).*?/
const RE_TIPRACK = /tiprack/i
const INSTRUMENT_AXES = {
  b: 'left',
  a: 'right'
}

const DEFAULT_JOG_DISTANCE_MM = '0.25'

export default function client (dispatch) {
  let rpcClient
  let remote

  // TODO(mc, 2017-09-22): build some sort of timer middleware instead?
  let runTimerInterval = NO_INTERVAL

  return function receive (state, action) {
    const {type} = action

    switch (type) {
      case actionTypes.CONNECT: return connect(state, action)
      case actionTypes.DISCONNECT: return disconnect(state, action)
      case actionTypes.SESSION: return createSession(state, action)
      // case actionTypes.HOME: return home(state, action)
      case actionTypes.MOVE_TO_FRONT: return moveToFront(state, action)
      case actionTypes.PROBE_TIP: return probeTip(state, action)
      case actionTypes.MOVE_TO: return moveTo(state, action)
      case actionTypes.JOG: return jog(state, action)
      case actionTypes.UPDATE_OFFSET: return updateOffset(state, action)
      case actionTypes.RUN: return run(state, action)
      case actionTypes.PAUSE: return pause(state, action)
      case actionTypes.RESUME: return resume(state, action)
      case actionTypes.CANCEL: return cancel(state, action)
    }
  }

  function connect () {
    if (rpcClient) return dispatch(actions.connectResponse())

    RpcClient(URL)
      .then((c) => {
        rpcClient = c
        rpcClient
          .on('notification', handleRobotNotification)
          .on('error', handleClientError)

        remote = rpcClient.remote

        if (remote.session_manager.session) {
          handleApiSession(remote.session_manager.session)
        }

        dispatch(actions.connectResponse())
      })
      .catch((e) => dispatch(actions.connectResponse(e)))
  }

  function disconnect () {
    if (!rpcClient) return dispatch(actions.disconnectResponse())

    rpcClient.close()
      .then(() => {
        // null out saved client and remote
        rpcClient = null
        remote = null

        clearRunTimerInterval()
        dispatch(actions.disconnectResponse())
      })
      .catch((error) => dispatch(actions.disconnectResponse(error)))
  }

  function createSession (state, action) {
    const file = action.payload.file
    const name = file.name
    const reader = new FileReader()

    reader.onload = function handleProtocolRead (event) {
      remote.session_manager.create(name, event.target.result)
        .then((apiSession) => {
          // TODO(mc, 2017-10-09): This seems like an API responsibility
          remote.session_manager.session = apiSession
          handleApiSession(apiSession, true)
        })
        .catch((error) => dispatch(actions.sessionResponse(error)))
    }

    return reader.readAsText(file)
  }

  function moveToFront (state, action) {
    const {payload: {instrument: axis}} = action
    const instrument = selectors.getState(state).protocolInstrumentsByAxis[axis]

    // FIXME(mc, 2017-10-05): DEBUG CODE
    // return setTimeout(() => dispatch(actions.moveToFrontResponse()), 2000)

    remote.calibration_manager.move_to_front(instrument)
      .then(() => dispatch(actions.moveToFrontResponse()))
      .catch((error) => dispatch(actions.moveToFrontResponse(error)))
  }

  function probeTip (state, action) {
    const {payload: {instrument: axis}} = action
    const instrument = selectors.getState(state).protocolInstrumentsByAxis[axis]

    // FIXME(mc, 2017-10-05): DEBUG CODE
    // return setTimeout(() => dispatch(actions.probeTipResponse()), 2000)

    remote.calibration_manager.tip_probe(instrument)
      .then(() => dispatch(actions.probeTipResponse()))
      .catch((error) => dispatch(actions.probeTipResponse(error)))
  }

  function moveTo (state, action) {
    const {payload: {instrument: axis, labware: slot}} = action
    const {
      protocolInstrumentsByAxis: instruments,
      protocolLabwareBySlot: labwares
    } = selectors.getState(state)

    remote.calibration_manager.move_to(instruments[axis], labwares[slot])
      .then(() => dispatch(actions.moveToResponse()))
      .catch((error) => dispatch(actions.moveToResponse(error)))
  }

  // TODO(mc, 2017-10-06): signature is instrument, distance, axis
  // axis is x, y, z, not left and right (which we will call mount)
  function jog (state, action) {
    const {payload: {instrument: instrumentAxis, axis, direction}} = action
    const instrument = selectors.getState(state).protocolInstrumentsByAxis[instrumentAxis]
    const distance = DEFAULT_JOG_DISTANCE_MM * direction

    // FIXME(mc, 2017-10-06): DEBUG CODE
    // return setTimeout(() => dispatch(actions.jogResponse()), 2000)

    remote.calibration_manager.jog(instrument, distance, axis)
      .then(() => dispatch(actions.jogResponse()))
      .catch((error) => dispatch(actions.jogResponse(error)))
  }

  function updateOffset (state, action) {
    const {payload: {instrument: axis, labware: slot}} = action
    const {
      protocolInstrumentsByAxis: instruments,
      protocolLabwareBySlot: labwares
    } = selectors.getState(state)

    // TODO(mc, 2017-10-06)

    // FIXME(mc, 2017-10-06): DEBUG CODE
    // return setTimeout(() => {
    //   dispatch(actions.updateOffsetResponse())
    //   dispatch(push('/setup-deck'))
    // }, 2000)

    remote.calibration_manager.update_container_offset(labwares[slot], instruments[axis])
      .then(() => {
        dispatch(actions.updateOffsetResponse())
        // TODO(mc, 2017-10-06): do this without a double dispatch
        // also this hardcoded URL is a bad idea™
        dispatch(push('/setup-deck'))
      })
      .catch((error) => dispatch(actions.updateOffsetResponse(error)))
  }

  function run (state, action) {
    setRunTimerInterval()
    remote.session_manager.session.run()
      .then(() => dispatch(actions.runResponse()))
      .catch((error) => dispatch(actions.runResponse(error)))
      .then(() => clearRunTimerInterval())
  }

  function pause (state, action) {
    remote.session_manager.session.pause()
      .then(() => dispatch(actions.pauseResponse()))
      .catch((error) => dispatch(actions.pauseResponse(error)))
  }

  function resume (state, action) {
    remote.session_manager.session.resume()
      .then(() => dispatch(actions.resumeResponse()))
      .catch((error) => dispatch(actions.resumeResponse(error)))
  }

  function cancel (state, action) {
    remote.session_manager.session.stop()
      .then(() => dispatch(actions.cancelResponse()))
      .catch((error) => dispatch(actions.cancelResponse(error)))
  }

  function setRunTimerInterval () {
    if (runTimerInterval === NO_INTERVAL) {
      runTimerInterval = setInterval(
        () => dispatch(actions.tickRunTime()),
        RUN_TIME_TICK_INTERVAL_MS
      )
    }
  }

  function clearRunTimerInterval () {
    clearInterval(runTimerInterval)
    runTimerInterval = NO_INTERVAL
  }

  function handleApiSession (apiSession) {
    const {
      name,
      protocol_text,
      commands,
      command_log,
      state,
      instruments,
      containers
    } = apiSession
    const protocolCommands = []
    const protocolCommandsById = {}
    const protocolInstrumentsByAxis = {}
    const protocolLabwareBySlot = {}

    // ensure run timer is running or stopped
    if (state === constants.RUNNING) {
      setRunTimerInterval()
    } else {
      clearRunTimerInterval()
    }

    // TODO(mc, 2017-08-30): Use a reduce
    commands.forEach(makeHandleCommand())
    instruments.forEach(apiInstrumentToInstrument)
    containers.forEach(apiContainerToContainer)

    const payload = {
      sessionName: name,
      protocolText: protocol_text,
      protocolCommands,
      protocolCommandsById,
      protocolInstrumentsByAxis,
      protocolLabwareBySlot,
      // TODO(mc, 2017-09-06): handle session errors
      sessionErrors: [],
      sessionState: state
    }

    dispatch(actions.sessionResponse(null, payload))

    function makeHandleCommand (depth = 0) {
      return function handleCommand (command) {
        const {id, description} = command
        const logEntry = command_log[id]
        const children = Array.from(command.children)
        let handledAt = ''

        if (logEntry) handledAt = logEntry.timestamp
        if (depth === 0) protocolCommands.push(id)

        children.forEach(makeHandleCommand(depth + 1))

        protocolCommandsById[id] = {
          id,
          description,
          handledAt,
          children: children.map((c) => c.id)
        }
      }
    }

    function apiInstrumentToInstrument (apiInstrument) {
      const {_id, axis: originalAxis, name, channels} = apiInstrument
      const axis = INSTRUMENT_AXES[originalAxis]
      const volume = Number(name.match(RE_VOLUME)[1])

      protocolInstrumentsByAxis[axis] = {_id, axis, name, channels, volume}
    }

    function apiContainerToContainer (apiContainer) {
      const {_id, name, type, slot: id} = apiContainer
      const isTiprack = RE_TIPRACK.test(type)
      const slot = letterSlotToNumberSlot(id)

      protocolLabwareBySlot[slot] = {_id, name, id, slot, type, isTiprack}
    }
  }

  function handleRobotNotification (message) {
    const {topic, payload} = message

    switch (topic) {
      case 'session': return handleApiSession(payload)
    }
  }

  function handleClientError (error) {
    console.error(error)
  }
}

// swap OT1 protocol slot to OT2 protocol slot
// TODO(mc, 2017-10-03): be less "clever" about this
// 4 10|11|_t
// 3 _7|_8|_9
// 2 _4|_5|_6
// 1 _1|_2|_3
//    A  B  C
function letterSlotToNumberSlot (slot) {
  // split two-char string into charcodes
  const [col, row] = Array.from(slot.toUpperCase()).map((c) => c.charCodeAt(0))

  // slot = (col where A === 1, B === 2, C === 3) + 3 * (row - 1)
  // 'A'.charCodeAt(0) === 65, '1'.charCodeAt(0) === 49
  // before simplification: 3 * (row - 49) + (col - 64)
  return (3 * row + col - 211)
}
