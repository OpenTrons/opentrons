import React from 'react'
import {Link} from 'react-router-dom'
import PropTypes from 'prop-types'
import classnames from 'classnames'
import styles from './SetupPanel.css'

function PipetteLinks (props) {
  const {axis, volume, channels, isProbed} = props
  const url = `/setup-instruments/${axis}`
  const style = isProbed
    ? styles.confirmed
    : styles.alert
  return (
    <li key={axis}>
      <Link to={url} className={style}>
        <span className={styles.axis}>{axis}</span>
        <span className={styles.type}>{channels}-Channel ({volume}ul)</span>
      </Link>
    </li>
  )
}

function LabwareLinks (props) {
  const {name, slot, isConfirmed, isTiprack, isTipracksConfirmed} = props
  const url = `/setup-deck/${slot}`
  const calibrationStyle = isConfirmed
    ? styles.confirmed
    : styles.alert
  let isDisabled = !isTiprack && !isTipracksConfirmed
  return (
    <li key={slot}>
      <Link to={url} className={classnames({[styles.disabled]: isDisabled}, calibrationStyle)}>
        [{slot}] {name}
      </Link>
    </li>
  )
}

export default function SetupPanel (props) {
  const {
    instruments,
    labware,
    isInstrumentsConfirmed,
    isLabwareConfirmed,
    isTipracksConfirmed
  } = props
  const instrumentList = instruments.map((inst) => PipetteLinks({
    ...inst
  }))
  let tiprackList = []
  let labwareList = []
  labware.map((lab) => {
    if (lab.isTiprack) {
      tiprackList.push(LabwareLinks({...lab}))
    } else {
      labwareList.push(LabwareLinks(
        {...lab, isTipracksConfirmed}
      ))
    }
  })
  const pipetteSetup =
    <section className={styles.pipette_group}>
      <Link to='/setup-instruments'>Pipette Setup</Link>
      <ul>
        {instrumentList}
      </ul>
    </section>

  let labwareSetup
  if (isInstrumentsConfirmed) {
    labwareSetup =
      <section className={styles.labware_group}>
        <Link to='/setup-deck'>Labware Setup</Link>
        <ul>
          {tiprackList}
          {labwareList}
        </ul>
      </section>
  }

  let runLink
  if (isLabwareConfirmed) {
    runLink = <Link to='/run' className={styles.run_link}>Run Protocol</Link>
  }

  return (
    <div className={styles.setup_panel}>
      <h1>Prepare Robot for RUN</h1>
      <section className={styles.links}>
        {pipetteSetup}
        {labwareSetup}
      </section>
      {runLink}
    </div>
  )
}

SetupPanel.propTypes = {
  instruments: PropTypes.arrayOf(PropTypes.shape({
    axis: PropTypes.string.isRequired,
    channels: PropTypes.number.isRequired,
    volume: PropTypes.number.isRequired,
    isProbed: PropTypes.bool.isRequired
  })).isRequired,
  labware: PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string.isRequired,
    slot: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    isConfirmed: PropTypes.bool.isRequired,
    isTiprack: PropTypes.bool.isRequired
  })).isRequired,
  isInstrumentsConfirmed: PropTypes.bool.isRequired,
  isTipracksConfirmed: PropTypes.bool.isRequired,
  isLabwareConfirmed: PropTypes.bool.isRequired
}
