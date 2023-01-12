import * as React from 'react'
import { useTranslation } from 'react-i18next'

import {
  Flex,
  Icon,
  Link,
  ALIGN_CENTER,
  ALIGN_FLEX_START,
  BORDERS,
  COLORS,
  DIRECTION_COLUMN,
  FLEX_NONE,
  JUSTIFY_CENTER,
  JUSTIFY_SPACE_BETWEEN,
  SPACING,
  TYPOGRAPHY,
} from '@opentrons/components'

import { TertiaryButton } from '../../atoms/buttons'
import { StatusLabel } from '../../atoms/StatusLabel'
import { StyledText } from '../../atoms/text'

import type { SubTaskProps, TaskListProps, TaskProps } from './types'

interface ProgressTrackerItemProps {
  activeIndex: [number, number] | null
  subTasks: SubTaskProps[]
  taskIndex: number
  taskListLength: number
  isComplete?: boolean
}

function ProgressTrackerItem({
  activeIndex,
  subTasks,
  taskIndex,
  taskListLength,
  isComplete = false,
}: ProgressTrackerItemProps): JSX.Element {
  const [activeTaskIndex, activeSubTaskIndex] = activeIndex ?? []

  const isTaskListComplete = activeIndex == null
  const isPastTask = activeTaskIndex != null && taskIndex < activeTaskIndex
  const isLastTask = taskIndex === taskListLength - 1
  const hasSubTasks = subTasks.length > 0
  const isActiveTaskWithSubtasks = taskIndex === activeTaskIndex && hasSubTasks
  const isFutureTask = activeTaskIndex != null && taskIndex > activeTaskIndex

  // a connector between task icons
  const taskConnector = (
    <Flex
      flex="1"
      borderLeft={BORDERS.lineBorder}
      borderColor={
        isTaskListComplete || isPastTask || isActiveTaskWithSubtasks
          ? COLORS.blueEnabled
          : ''
      }
      marginTop="-0.75rem"
      // shorten connector length when subtasks are present
      marginBottom={
        hasSubTasks
          ? `-${String(SPACING.spacing3)}`
          : `-${String(SPACING.spacingM)}`
      }
      height="100%"
    />
  )

  const noSubTaskConnector = !isLastTask ? taskConnector : null

  return (
    <Flex flexDirection={DIRECTION_COLUMN} alignItems={ALIGN_CENTER}>
      {isComplete || isTaskListComplete || isPastTask ? (
        <Icon
          size="1.25rem"
          margin={SPACING.spacing4}
          name="ot-check"
          color={
            isTaskListComplete || isPastTask
              ? COLORS.blueEnabled
              : COLORS.medGreyHover
          }
        />
      ) : (
        <Flex
          flex={FLEX_NONE}
          alignItems={ALIGN_CENTER}
          justifyContent={JUSTIFY_CENTER}
          backgroundColor={
            isFutureTask ? COLORS.medGreyHover : COLORS.blueEnabled
          }
          color={COLORS.white}
          margin={SPACING.spacing4}
          height="1.25rem"
          width="1.25rem"
          borderRadius="0.625rem"
        >
          <StyledText as="label">{(taskIndex + 1).toString()}</StyledText>
        </Flex>
      )}
      {!hasSubTasks ? (
        noSubTaskConnector
      ) : (
        <>
          {/**
           * iterate subtask completion list -
           * APPROXIMATION: average amount of space via flex-grow to position the substep connectors/icons
           * ASSUMPTION: substeps don't vary much in size for current use case - maybe one line of wrapped text at most
           * TODO (bh, 9/28/2022): this could change in the future if the task list is used for tasks that contain differently sized children, like deck map rendering, etc
           * a more robust solution to subtask icon layout could implement an n x 2 grid where n is the combined number of tasks/subtasks, in two columns (fixed size, 1fr)
           * this would require top level coordination of both the number of tasks/subtasks and the open status of each task
           * which is possible, but nice to avoid
           * */}
          {taskConnector}
          {subTasks.map((subTask, subTaskIndex) => {
            const isPastSubTask =
              (activeTaskIndex != null &&
                activeSubTaskIndex != null &&
                subTaskIndex <= activeSubTaskIndex &&
                taskIndex < activeTaskIndex) ||
              (activeTaskIndex != null &&
                subTask.isComplete &&
                taskIndex <= activeTaskIndex)
            const isFutureSubTask =
              (activeSubTaskIndex != null &&
                activeTaskIndex != null &&
                subTaskIndex > activeSubTaskIndex &&
                taskIndex >= activeTaskIndex) ||
              isFutureTask
            // last subtask of the parent task
            const isLastSubTask = subTaskIndex === subTasks.length - 1
            // last subtask of the last task of the entire list
            const isFinalSubTaskOfTaskList = isLastSubTask && isLastTask

            return (
              <React.Fragment key={subTask.title}>
                {/* subtask circle icon component */}
                <Flex
                  flex={FLEX_NONE}
                  alignItems={ALIGN_CENTER}
                  justifyContent={JUSTIFY_CENTER}
                  // fill in circle for past or completed subtasks
                  backgroundColor={
                    // is in the past or list is complete
                    isTaskListComplete || isPastSubTask
                      ? COLORS.blueEnabled
                      : subTask.isComplete === true
                      ? COLORS.medGreyHover
                      : 'initial'
                  }
                  border={BORDERS.lineBorder}
                  borderColor={
                    isFutureSubTask ? COLORS.medGreyHover : COLORS.blueEnabled
                  }
                  borderWidth={SPACING.spacing1}
                  color={COLORS.white}
                  margin={SPACING.spacing4}
                  height="0.75rem"
                  width="0.75rem"
                  borderRadius="0.375rem"
                />
                {/* subtask connector component */}
                <Flex
                  flex="1"
                  borderLeft={BORDERS.lineBorder}
                  borderColor={
                    // do not show the subtask connector if it's the final subtask of the task list
                    isFinalSubTaskOfTaskList
                      ? COLORS.transparent
                      : isTaskListComplete || isPastSubTask
                      ? COLORS.blueEnabled
                      : COLORS.medGreyEnabled
                  }
                  marginTop={`-${String(SPACING.spacing3)}`}
                  marginBottom={
                    // extend connector for last subtask
                    isLastSubTask
                      ? `-${String(SPACING.spacingM)}`
                      : `-${String(SPACING.spacing3)}`
                  }
                  height="100%"
                />
              </React.Fragment>
            )
          })}
        </>
      )}
    </Flex>
  )
}

function SubTask({
  activeIndex,
  subTaskIndex,
  taskIndex,
  title,
  description,
  cta,
  footer,
}: SubTaskProps): JSX.Element {
  const [activeTaskIndex, activeSubTaskIndex] = activeIndex ?? []

  const isTaskListComplete = activeIndex == null
  const isActiveSubTask =
    activeSubTaskIndex === subTaskIndex && activeTaskIndex === taskIndex
  const isPastSubTask =
    activeTaskIndex != null &&
    activeSubTaskIndex != null &&
    ((activeSubTaskIndex > subTaskIndex && activeTaskIndex === taskIndex) ||
      activeTaskIndex > taskIndex)

  return (
    <Flex
      alignItems={ALIGN_CENTER}
      backgroundColor={isActiveSubTask ? COLORS.lightBlue : COLORS.white}
      justifyContent={JUSTIFY_SPACE_BETWEEN}
      padding={SPACING.spacing4}
      border={isActiveSubTask ? BORDERS.activeLineBorder : BORDERS.lineBorder}
      borderRadius={BORDERS.radiusSoftCorners}
      gridGap={SPACING.spacing5}
      width="100%"
    >
      <Flex
        alignItems={ALIGN_FLEX_START}
        flexDirection={DIRECTION_COLUMN}
        gridGap={SPACING.spacing2}
      >
        <StyledText as="h3" fontWeight={TYPOGRAPHY.fontWeightSemiBold}>
          {title}
        </StyledText>
        <StyledText as="p">{description}</StyledText>
        {footer != null ? (
          <StyledText as="p" color={COLORS.darkGreyEnabled}>
            {footer}
          </StyledText>
        ) : null}
      </Flex>
      {(isTaskListComplete || isPastSubTask) && cta != null ? (
        <Link css={TYPOGRAPHY.darkLinkLabelSemiBold} onClick={cta.onClick}>
          {cta.label}
        </Link>
      ) : null}
      {isActiveSubTask && cta != null ? (
        <TertiaryButton onClick={cta.onClick}>{cta.label}</TertiaryButton>
      ) : null}
    </Flex>
  )
}

function Task({
  activeIndex,
  taskIndex,
  title,
  description,
  cta,
  footer,
  subTasks,
  taskListLength,
  isComplete,
}: TaskProps): JSX.Element {
  const [isTaskOpen, setIsTaskOpen] = React.useState<boolean>(false)

  const [activeTaskIndex] = activeIndex ?? []

  // TODO(bh, 2022-10-18): pass booleans to children as props
  const isTaskListComplete = activeIndex == null
  const isPastTask = activeTaskIndex != null && taskIndex < activeTaskIndex
  const isActiveTask = activeTaskIndex === taskIndex
  const hasSubTasks = subTasks.length > 0

  return (
    <Flex key={title}>
      <ProgressTrackerItem
        activeIndex={activeIndex}
        isComplete={isComplete}
        taskIndex={taskIndex}
        subTasks={isTaskOpen ? subTasks : []}
        taskListLength={taskListLength}
      />
      <Flex
        flexDirection={DIRECTION_COLUMN}
        padding={SPACING.spacing4}
        backgroundColor={
          isActiveTask && !isTaskOpen ? COLORS.lightBlue : COLORS.white
        }
        border={
          isActiveTask && !isTaskOpen
            ? BORDERS.activeLineBorder
            : BORDERS.lineBorder
        }
        borderRadius={BORDERS.radiusSoftCorners}
        width="100%"
      >
        <Flex
          alignItems={ALIGN_CENTER}
          justifyContent={JUSTIFY_SPACE_BETWEEN}
          gridGap={SPACING.spacing5}
          // click to open the subtask drawer if subtasks are present
          cursor={hasSubTasks ? 'pointer' : ''}
          onClick={() => (hasSubTasks ? setIsTaskOpen(!isTaskOpen) : null)}
        >
          <Flex
            alignItems={ALIGN_FLEX_START}
            flexDirection={DIRECTION_COLUMN}
            gridGap={SPACING.spacing2}
          >
            <StyledText as="h3" fontWeight={TYPOGRAPHY.fontWeightSemiBold}>
              {title}
            </StyledText>
            <StyledText as="p">{description}</StyledText>
            {footer != null ? (
              <StyledText as="p" color={COLORS.darkGreyEnabled}>
                {footer}
              </StyledText>
            ) : null}
          </Flex>
          {/* if subtasks, caret, otherwise show cta as link or button */}
          {hasSubTasks ? (
            <Icon
              name={isTaskOpen ? 'chevron-up' : 'chevron-down'}
              height="15px"
            />
          ) : (isTaskListComplete || isPastTask) && cta != null ? (
            <Link css={TYPOGRAPHY.darkLinkLabelSemiBold} onClick={cta.onClick}>
              {cta.label}
            </Link>
          ) : null}
          {isActiveTask && cta != null ? (
            <TertiaryButton onClick={cta.onClick}>{cta.label}</TertiaryButton>
          ) : null}
        </Flex>
        {isTaskOpen ? (
          <Flex
            flexDirection={DIRECTION_COLUMN}
            marginTop={SPACING.spacing4}
            gridGap={SPACING.spacing3}
          >
            {subTasks.map(
              ({ title, description, cta, footer }, subTaskIndex) => (
                <SubTask
                  key={title}
                  title={title}
                  description={description}
                  cta={cta}
                  footer={footer}
                  activeIndex={activeIndex}
                  subTaskIndex={subTaskIndex}
                  taskIndex={taskIndex}
                />
              )
            )}
          </Flex>
        ) : null}
      </Flex>
    </Flex>
  )
}

export function TaskList({
  activeIndex,
  taskList,
}: TaskListProps): JSX.Element {
  const { t } = useTranslation('robot_calibration')

  // start off assuming we are missing calibrations
  let statusLabelBackgroundColor = COLORS.errorEnabled
  let statusLabelIconColor = COLORS.errorEnabled
  let statusLabelText = t('missing_calibration_data')

  // if the tasklist is empty, though, all calibrations are good
  if (activeIndex == null) {
    statusLabelBackgroundColor = COLORS.successEnabled
    statusLabelIconColor = COLORS.successEnabled
    statusLabelText = t('calibration_complete')
    // if we have tasks and they are all marked bad, then we should
    // strongly suggest they re-do those calibrations
  } else if (
    taskList.filter(tp => tp.subTasks.every(st => st.markedBad)).length ===
    taskList.length
  ) {
    statusLabelBackgroundColor = COLORS.warningEnabled
    statusLabelIconColor = COLORS.warningEnabled
    statusLabelText = t('calibration_recommended')
  }

  return (
    <>
      <Flex alignItems={ALIGN_CENTER} gridGap={SPACING.spacing3}>
        <StyledText css={TYPOGRAPHY.h2SemiBold}>
          {t('calibration_status')}
        </StyledText>
        <StatusLabel
          status={statusLabelText}
          backgroundColor={`${String(statusLabelBackgroundColor)}${String(
            COLORS.opacity12HexCode
          )}`}
          iconColor={statusLabelIconColor}
          textColor={COLORS.darkBlackEnabled}
          fontWeight={TYPOGRAPHY.fontWeightSemiBold}
          iconSize="0.313rem"
        />
      </Flex>
      <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing3}>
        {taskList.map(
          (
            { title, description, cta, footer, subTasks, isComplete },
            taskIndex
          ) => (
            <Task
              key={title}
              title={title}
              description={description}
              cta={cta}
              footer={footer}
              subTasks={subTasks}
              activeIndex={activeIndex}
              taskIndex={taskIndex}
              taskListLength={taskList.length}
              isComplete={isComplete}
            />
          )
        )}
      </Flex>
    </>
  )
}
