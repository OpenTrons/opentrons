import React from 'react'
import PropTypes from 'prop-types'
import classnames from 'classnames'

import styles from './Plate.css'
import { intToAlphabetLetter, transpose } from '../utils.js'

class Plate extends React.Component {
  static propTypes = {
    wellMatrix: PropTypes.array.isRequired,
    showLabels: PropTypes.bool,
    cssFillParent: PropTypes.bool, // if true, plate stretches to fill parent element, instead of having its own aspect ratio
    transpose: PropTypes.bool,

    Well: PropTypes.func.isRequired // this fn should return a Well React element
  }

  makeColumns () {
    const { wellMatrix, Well, selectable, showLabels } = this.props

    return transpose(wellMatrix).map((row, x) =>
      row.map((wellContent, y) =>
        <Well key={y}
          selectable={selectable}
          x={x}
          y={row.length - y - 1}
          data-row-num={showLabels && row.length - y}
          wellContent={wellContent} />
      )
    )
  }

  wrapColumn = (wells, colIdx) => {
    // wrap a row of wells in a .row div
    return <div className={styles.grid_col} key={colIdx}>
      {wells}
      {this.props.showLabels &&
        <div className={styles.col_label} key={'letterLabel' + colIdx}>{intToAlphabetLetter(colIdx)}</div>
      }
    </div>
  }

  render () {
    const { showLabels, className, transpose, wellMatrix, Well, cssFillParent, ...otherProps } = this.props

    return (
      <section className={cssFillParent ? styles.fill_parent : styles.aspect_ratio}>
        <div className={styles.layout_wrapper}>
          <div {...otherProps}
            className={classnames(styles[className], styles.plate)}
          >
            {wellMatrix && this.makeColumns().map(this.wrapColumn)}
          </div>

          {showLabels &&
            <div className={styles.row_labels_filler} />
          }
        </div>
      </section>
    )
  }
}

export default Plate
