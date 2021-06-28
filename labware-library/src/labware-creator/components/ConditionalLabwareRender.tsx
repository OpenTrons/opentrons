import * as React from 'react'
import cloneDeep from 'lodash/cloneDeep'
import {
  LabwareRender,
  LabwareOutline,
  RobotCoordsForeignDiv,
  RobotWorkSpace,
} from '@opentrons/components'
import {
  SLOT_LENGTH_MM as DEFAULT_X_DIMENSION,
  SLOT_WIDTH_MM as DEFAULT_Y_DIMENSION,
} from '@opentrons/shared-data'
import { labwareFormSchema } from '../labwareFormSchema'
import { fieldsToLabware } from '../fieldsToLabware'
import type { LabwareFields, ProcessedLabwareFields } from '../fields'
import styles from './ConditionalLabwareRender.css'

interface Props {
  values: LabwareFields
}

const calculateViewBox = (args: {
  bBox: DOMRect | undefined
  xDim: number
  yDim: number
}): string => {
  const { bBox, xDim, yDim } = args

  // by-eye margin to make sure there is no visual clipping
  const MARGIN = 5

  // calculate viewBox such that SVG is zoomed and panned with the bBox fully in view,
  // in a "zoom to fit" manner, plus some visual margin to prevent clipping
  return `${(bBox?.x ?? 0) - MARGIN} ${(bBox?.y ?? 0) - MARGIN} ${
    xDim + MARGIN * 2
  } ${yDim + MARGIN * 2}`
}

export const ConditionalLabwareRender = (props: Props): JSX.Element => {
  const gRef = React.useRef<SVGGElement>(null)
  const [bBox, updateBBox] = React.useState<DOMRect | undefined>(
    gRef.current ? gRef.current.getBBox() : undefined
  )

  // In order to implement "zoom to fit", we're calculating the desired viewBox based on getBBox of the child.
  // So we have to actually render the child to get its bounding box. After that, we re-calculate the viewBox.
  // Once the viewBox is re-calculated, we use setState to force a re-render.
  const nextBBox = gRef.current?.getBBox()
  React.useLayoutEffect((): void => {
    if (
      nextBBox != null &&
      (nextBBox.width !== bBox?.width || nextBBox.height !== bBox?.height)
    ) {
      updateBBox(nextBBox)
    }
  }, [bBox?.height, bBox?.width, nextBBox])

  const definition = React.useMemo(() => {
    const values = cloneDeep(props.values)

    // Fill arbitrary values in to any missing fields that aren't needed for this render,
    // eg some required definition data like well volume, height, and bottom shape don't affect the render.
    values.footprintXDimension =
      values.footprintXDimension || `${DEFAULT_X_DIMENSION}`
    values.footprintYDimension =
      values.footprintYDimension || `${DEFAULT_Y_DIMENSION}`
    values.labwareZDimension = values.wellDepth || '100'
    values.wellDepth = values.wellDepth || '80'
    values.wellVolume = values.wellVolume || '50'
    values.wellBottomShape = values.wellBottomShape || 'flat'
    values.labwareType = values.labwareType || 'wellPlate'

    values.displayName = values.displayName || 'Some Labware'
    values.loadName = values.loadName || 'some_labware'
    values.brand = values.brand || 'somebrand'
    // A few other fields don't even go into the definition (eg "is row spacing uniform" etc).
    values.homogeneousWells = 'true'
    values.regularRowSpacing = 'true'
    values.regularColumnSpacing = 'true'
    values.pipetteName = 'whatever'

    let castValues: ProcessedLabwareFields | null = null
    try {
      castValues = labwareFormSchema.cast(values)
      // TODO IMMEDIATELY: if we stick with this instead of single value casting, sniff this error to make sure it's
      // really a Yup validation error (see how Formik does it in `Formik.tsx`).
      // See #7824 and see pattern in formLevelValidation fn
    } catch (error) {}

    if (castValues === null) {
      return null
    }

    let def = null
    if (castValues) {
      def = fieldsToLabware(castValues)
    } else {
      console.log('invalid, no def for conditional render')
    }
    return def
  }, [props.values])

  const xDim =
    definition != null
      ? bBox?.width ?? definition.dimensions.xDimension
      : DEFAULT_X_DIMENSION
  const yDim =
    definition != null
      ? bBox?.height ?? definition.dimensions.yDimension
      : DEFAULT_Y_DIMENSION

  return (
    <RobotWorkSpace viewBox={calculateViewBox({ bBox, xDim, yDim })}>
      {() =>
        definition != null ? (
          <LabwareRender definition={definition} gRef={gRef} />
        ) : (
          <>
            <LabwareOutline />
            <RobotCoordsForeignDiv
              x={0}
              y={0}
              width={xDim}
              height={yDim}
              innerDivProps={{ className: styles.error_text_wrapper }}
            >
              <div className={styles.error_text}>
                Add missing info to see labware preview
              </div>
            </RobotCoordsForeignDiv>
          </>
        )
      }
    </RobotWorkSpace>
  )
}
