import b2t_l2r from '../../../assets/images/well-order_b2t-l2r.jpg'
import b2t_r2l from '../../../assets/images/well-order_b2t-r2l.jpg'
import l2r_b2t from '../../../assets/images/well-order_l2r-b2t.jpg'
import l2r_t2b from '../../../assets/images/well-order_l2r-t2b.jpg'
import r2l_b2t from '../../../assets/images/well-order_r2l-b2t.jpg'
import r2l_t2b from '../../../assets/images/well-order_r2l-t2b.jpg'
import t2b_l2r from '../../../assets/images/well-order_t2b-l2r.jpg'
import t2b_r2l from '../../../assets/images/well-order_t2b-r2l.jpg'

import type { WellOrderOption } from '../../../form-types'

interface WellOrderVisualizationProps {
  firstValue: WellOrderOption
  secondValue: WellOrderOption
}

const imageMap: Record<string, string> = {
  b2t_l2r,
  b2t_r2l,
  l2r_b2t,
  l2r_t2b,
  r2l_b2t,
  r2l_t2b,
  t2b_l2r,
  t2b_r2l,
}

export function WellOrderVisualization(
  props: WellOrderVisualizationProps
): JSX.Element {
  const { firstValue, secondValue } = props
  const imageKey = `${firstValue}_${secondValue}`

  return (
    <img
      width="253px"
      height="274px"
      src={imageMap[imageKey]}
      alt={`${firstValue} ${secondValue}`}
    />
  )
}
