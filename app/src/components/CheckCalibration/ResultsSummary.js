// @flow
import * as React from 'react'
import reduce from 'lodash/reduce'
import { css } from 'styled-components'
import {
  Icon,
  Box,
  Flex,
  PrimaryBtn,
  Text,
  Link,
  SPACING_2,
  SPACING_3,
  ALIGN_CENTER,
  C_BLUE,
  COLOR_SUCCESS,
  COLOR_WARNING,
  OVERLAY_LIGHT_GRAY_50,
  FONT_HEADER_DARK,
  FONT_SIZE_BODY_2,
  FONT_SIZE_BODY_1,
  FONT_WEIGHT_SEMIBOLD,
  JUSTIFY_CENTER,
  JUSTIFY_SPACE_BETWEEN,
  JUSTIFY_SPACE_AROUND,
  JUSTIFY_START,
  TEXT_TRANSFORM_CAPITALIZE,
  TEXT_TRANSFORM_UPPERCASE,
  FONT_STYLE_ITALIC,
  SPACING_5,
  SPACING_4,
  SPACING_1,
  SPACING_7,
  DIRECTION_COLUMN,
  DISPLAY_INLINE_BLOCK,
} from '@opentrons/components'

import { getPipetteModelSpecs } from '@opentrons/shared-data'

import find from 'lodash/find'
import { PIPETTE_MOUNTS, LEFT, RIGHT } from '../../pipettes'
import { saveAs } from 'file-saver'

import type { CalibrationPanelProps } from '../CalibrationPanels/types'
import {
  CHECK_STATUS_OUTSIDE_THRESHOLD,
  CHECK_STATUS_IN_THRESHOLD,
} from '../../sessions'
import type {
  CalibrationCheckInstrument,
  CalibrationCheckComparisonsPerCalibration,
} from '../../sessions/types'

const GOOD_CALIBRATION = 'Good calibration'
const BAD_CALIBRATION = 'Recalibration recommended'

const ROBOT_CALIBRATION_CHECK_SUMMARY_HEADER =
  'calibration health check results'
const DECK_CALIBRATION_HEADER = 'robot deck calibration'
const MOUNT = 'mount'
const HOME_AND_EXIT = 'Home robot and exit'
const DOWNLOAD_SUMMARY = 'Download detailed JSON Calibration Check summary'
const PIPETTE_OFFSET_CALIBRATION_HEADER = 'pipette offset calibration'
const TIP_LENGTH_CALIBRATION_HEADER = 'tip length calibration'
const NEED_HELP = 'If problems persist,'
const CONTACT_SUPPORT = 'contact Opentrons support'
const FOR_HELP = 'for help'
const SUPPORT_URL = 'https://support.opentrons.com'

const FOUND = 'Health check found'
const ONE_ISSUE = 'an issue'
const PLURAL_ISSUES = 'issues'
const RECALIBRATE_AS_INDICATED =
  'Redo the calibrations indicated below to troubleshoot'
const NOTE = 'Note'
const DO_DECK_FIRST = 'Recalibrate your deck before redoing other calibrations.'
const DECK_INVALIDATES =
  'Recalibrating your deck will invalidate Pipette Offsets, and you will need to recalibrate Pipette Offsets after redoing Deck Calibration.'
const NO_PIPETTE = 'No pipette attached'

export function ResultsSummary(props: CalibrationPanelProps): React.Node {
  const {
    comparisonsByPipette,
    instruments,
    checkBothPipettes,
    cleanUpAndExit,
  } = props

  if (!comparisonsByPipette || !instruments) {
    return null
  }

  const handleDownloadButtonClick = () => {
    const now = new Date()
    const report = {
      comparisonsByPipette,
      instruments,
      savedAt: now.toISOString(),
    }
    const data = new Blob([JSON.stringify(report, null, 4)], {
      type: 'application/json',
    })
    saveAs(data, 'OT-2 Robot Calibration Check Report.json')
  }

  const leftPipette = find(
    instruments,
    (p: CalibrationCheckInstrument) => p.mount.toLowerCase() === LEFT
  )
  const rightPipette = find(
    instruments,
    (p: CalibrationCheckInstrument) => p.mount.toLowerCase() === RIGHT
  )

  const calibrationsByMount = {
    left: {
      pipette: leftPipette,
      calibration: leftPipette
        ? comparisonsByPipette?.[leftPipette.rank] ?? null
        : null,
    },
    right: {
      pipette: rightPipette,
      calibration: rightPipette
        ? comparisonsByPipette?.[rightPipette.rank] ?? null
        : null,
    },
  }

  const getDeckCalibration = checkBothPipettes
    ? comparisonsByPipette.second.deck?.status
    : comparisonsByPipette.first.deck?.status
  const deckCalibrationResult = getDeckCalibration ?? null

  const pipetteResultsBad = perPipette => ({
    offsetBad: perPipette?.pipetteOffset?.status
      ? perPipette.pipetteOffset.status === CHECK_STATUS_OUTSIDE_THRESHOLD
      : false,
    tipLengthBad: perPipette?.tipLength?.status
      ? perPipette.tipLength.status === CHECK_STATUS_OUTSIDE_THRESHOLD
      : false,
  })

  return (
    <>
      <Flex
        width="100%"
        justifyContent={JUSTIFY_START}
        flexDirection={DIRECTION_COLUMN}
      >
        <Text
          css={FONT_HEADER_DARK}
          marginTop={SPACING_2}
          textTransform={TEXT_TRANSFORM_CAPITALIZE}
        >
          {ROBOT_CALIBRATION_CHECK_SUMMARY_HEADER}
        </Text>
        <Box minHeight={SPACING_2} marginBottom={SPACING_3}>
          <WarningText
            deckCalibrationBad={
              deckCalibrationResult
                ? deckCalibrationResult === CHECK_STATUS_OUTSIDE_THRESHOLD
                : false
            }
            pipettes={{
              left: pipetteResultsBad(calibrationsByMount.left.calibration),
              right: pipetteResultsBad(calibrationsByMount.right.calibration),
            }}
          />
        </Box>
      </Flex>
      <Flex marginBottom={SPACING_4}>
        <Box>
          <Text
            marginBottom={SPACING_2}
            textTransform={TEXT_TRANSFORM_CAPITALIZE}
            fontWeight={FONT_WEIGHT_SEMIBOLD}
            fontSize={FONT_SIZE_BODY_2}
          >
            {DECK_CALIBRATION_HEADER}
          </Text>
          <RenderResult status={deckCalibrationResult} />
        </Box>
      </Flex>
      <Flex marginBottom={SPACING_2} justifyContent={JUSTIFY_SPACE_BETWEEN}>
        {PIPETTE_MOUNTS.map(m => (
          <Box key={m} width="48%">
            <Text
              textTransform={TEXT_TRANSFORM_UPPERCASE}
              fontSize={FONT_SIZE_BODY_2}
              marginBottom={SPACING_3}
            >
              {`${m} ${MOUNT}`}
            </Text>
            <Box
              backgroundColor={OVERLAY_LIGHT_GRAY_50}
              paddingX="5%"
              height={SPACING_7}
            >
              {calibrationsByMount[m].pipette &&
              calibrationsByMount[m].calibration &&
              Object.entries(calibrationsByMount[m].calibration).length ? (
                <PipetteResult
                  pipetteInfo={calibrationsByMount[m].pipette}
                  pipetteCalibration={calibrationsByMount[m].calibration}
                />
              ) : (
                <Flex
                  alignItems={ALIGN_CENTER}
                  justifyContent={JUSTIFY_CENTER}
                  fontStyle={FONT_STYLE_ITALIC}
                  fontSize={FONT_SIZE_BODY_1}
                  flexDirection={DIRECTION_COLUMN}
                  height="100%"
                >
                  {NO_PIPETTE}
                </Flex>
              )}
            </Box>
          </Box>
        ))}
      </Flex>
      <Box>
        <Text
          as="a"
          color={C_BLUE}
          onClick={handleDownloadButtonClick}
          css={css`
            cursor: pointer;
          `}
          marginBottom={SPACING_5}
          fontSize={FONT_SIZE_BODY_2}
        >
          {DOWNLOAD_SUMMARY}
        </Text>

        <Flex
          marginTop={SPACING_4}
          marginBottom={SPACING_2}
          justifyContent={JUSTIFY_CENTER}
        >
          <PrimaryBtn width="95%" onClick={cleanUpAndExit}>
            {HOME_AND_EXIT}
          </PrimaryBtn>
        </Flex>
      </Box>
    </>
  )
}

type RenderResultProps = {|
  status: string | null,
|}

function RenderResult(props: RenderResultProps): React.Node {
  const { status } = props
  if (!status) {
    return null
  } else {
    const isGoodCal = status === CHECK_STATUS_IN_THRESHOLD
    return (
      <Flex>
        <Icon
          name={isGoodCal ? 'check-circle' : 'alert-circle'}
          height="1.25rem"
          width="1.25rem"
          color={isGoodCal ? COLOR_SUCCESS : COLOR_WARNING}
          marginRight="0.75rem"
        />
        <Text fontSize={FONT_SIZE_BODY_2}>
          {isGoodCal ? GOOD_CALIBRATION : BAD_CALIBRATION}
        </Text>
      </Flex>
    )
  }
}

type PipetteResultProps = {|
  pipetteInfo: CalibrationCheckInstrument,
  pipetteCalibration: CalibrationCheckComparisonsPerCalibration,
|}

function PipetteResult(props: PipetteResultProps): React.Node {
  const { pipetteInfo, pipetteCalibration } = props
  const displayName =
    getPipetteModelSpecs(pipetteInfo.model)?.displayName || pipetteInfo.model
  const tipRackDisplayName = pipetteInfo.tipRackDisplay
  return (
    <Flex
      paddingY={SPACING_2}
      flexDirection={DIRECTION_COLUMN}
      justifyContent={JUSTIFY_SPACE_AROUND}
      height="100%"
    >
      <Box>
        <Text
          fontSize={FONT_SIZE_BODY_2}
          fontWeight={FONT_WEIGHT_SEMIBOLD}
          marginBottom={SPACING_1}
          textTransform={TEXT_TRANSFORM_CAPITALIZE}
        >
          {PIPETTE_OFFSET_CALIBRATION_HEADER}
        </Text>
        <Text fontSize={FONT_SIZE_BODY_1} marginBottom={SPACING_2}>
          {displayName}
        </Text>
        <RenderResult
          status={pipetteCalibration.pipetteOffset?.status ?? null}
        />
      </Box>
      <Box>
        <Text
          fontSize={FONT_SIZE_BODY_2}
          fontWeight={FONT_WEIGHT_SEMIBOLD}
          marginBottom={SPACING_1}
          textTransform={TEXT_TRANSFORM_CAPITALIZE}
        >
          {TIP_LENGTH_CALIBRATION_HEADER}
        </Text>
        <Text fontSize={FONT_SIZE_BODY_1} marginBottom={SPACING_2}>
          {tipRackDisplayName}
        </Text>
        <RenderResult status={pipetteCalibration.tipLength?.status ?? null} />
      </Box>
    </Flex>
  )
}

function WarningText(props: {|
  deckCalibrationBad: boolean,
  pipettes: {|
    left: {| offsetBad: boolean, tipLengthBad: boolean |},
    right: {| offsetBad: boolean, tipLengthBad: boolean |},
  |},
|}): React.Node {
  const badCount = reduce(
    [
      props.deckCalibrationBad,
      props.pipettes.left.offsetBad,
      props.pipettes.left.tipLengthBad,
      props.pipettes.right.offsetBad,
      props.pipettes.right.tipLengthBad,
    ],
    (sum, item) => sum + (item === true ? 1 : 0),
    0
  )
  return badCount > 0 ? (
    <>
      <Box marginTop={SPACING_3} fontSize={FONT_SIZE_BODY_2}>
        <Text display={DISPLAY_INLINE_BLOCK}>
          {`${FOUND}`}
          &nbsp;
          {badCount === 1 ? ONE_ISSUE : PLURAL_ISSUES}. &nbsp;
          {`${RECALIBRATE_AS_INDICATED}.`}
        </Text>
        &nbsp;
        <Text display={DISPLAY_INLINE_BLOCK}>{NEED_HELP}</Text>
        &nbsp;
        <Link
          display={DISPLAY_INLINE_BLOCK}
          color={C_BLUE}
          external={true}
          href={SUPPORT_URL}
        >
          {CONTACT_SUPPORT}
        </Link>
        &nbsp;
        <Text display={DISPLAY_INLINE_BLOCK}>{`${FOR_HELP}.`}</Text>
      </Box>
      {props.deckCalibrationBad ? (
        <Text
          fontSize={FONT_SIZE_BODY_1}
          marginTop={SPACING_2}
          fontStyle={FONT_STYLE_ITALIC}
        >{`${NOTE}: ${
          badCount > 1 ? DO_DECK_FIRST : ''
        } ${DECK_INVALIDATES}`}</Text>
      ) : (
        <React.Fragment />
      )}
    </>
  ) : (
    <React.Fragment />
  )
}
