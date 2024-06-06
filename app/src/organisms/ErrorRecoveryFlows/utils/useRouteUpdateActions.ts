import * as React from 'react'
import last from 'lodash/last'
import head from 'lodash/head'

import { INVALID, RECOVERY_MAP, STEP_ORDER } from '../constants'

import type {
  IRecoveryMap,
  RecoveryRoute,
  RobotMovingRoute,
  RouteStep,
} from '../types'

export interface GetRouteUpdateActionsParams {
  hasLaunchedRecovery: boolean
  toggleERWizard: (launchER: boolean) => Promise<void>
  recoveryMap: IRecoveryMap
  setRecoveryMap: (recoveryMap: IRecoveryMap) => void
}

export interface UseRouteUpdateActionsResult {
  goBackPrevStep: () => Promise<void>
  proceedNextStep: () => Promise<void>
  proceedToRoute: (route: RecoveryRoute) => Promise<void>
  setRobotInMotion: (
    inMotion: boolean,
    movingRoute?: RobotMovingRoute
  ) => Promise<void>
}

// Utilities related to routing within the error recovery flows.
export function useRouteUpdateActions(
  routeUpdateActionsParams: GetRouteUpdateActionsParams
): UseRouteUpdateActionsResult {
  const { recoveryMap, setRecoveryMap } = routeUpdateActionsParams
  const { route: currentRoute, step: currentStep } = recoveryMap
  const stashedMapRef = React.useRef<IRecoveryMap | null>(null)
  const { OPTION_SELECTION, ROBOT_IN_MOTION } = RECOVERY_MAP

  // Redirect to the previous step for the current route if it exists, otherwise redirects to the option selection route.
  const goBackPrevStep = React.useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      const { getPrevStep } = getRecoveryRouteNavigation(currentRoute)
      const updatedStep = getPrevStep(currentStep)

      return determineRecoveryRouting({
        currentRoute,
        updatedStep,
        ...routeUpdateActionsParams,
      }).then(() => {
        resolve()
      })
    })
  }, [currentStep, currentRoute, routeUpdateActionsParams])

  // Redirect to the next step for the current route if it exists, otherwise redirects to the option selection route.
  const proceedNextStep = React.useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      const { getNextStep } = getRecoveryRouteNavigation(currentRoute)
      const updatedStep = getNextStep(currentStep)

      return determineRecoveryRouting({
        currentRoute,
        updatedStep,
        ...routeUpdateActionsParams,
      }).then(() => {
        resolve()
      })
    })
  }, [currentStep, currentRoute, routeUpdateActionsParams])

  // Redirect to a specific route.
  const proceedToRoute = React.useCallback(
    (route: RecoveryRoute): Promise<void> => {
      return new Promise((resolve, reject) => {
        const newFlowSteps = STEP_ORDER[route]
        setRecoveryMap({ route, step: head(newFlowSteps) as RouteStep })
        resolve()
      })
    },
    []
  )

  // Stashes the current map then sets the current map to robot in motion. Restores the map after motion completes.
  const setRobotInMotion = React.useCallback(
    (inMotion: boolean, robotMovingRoute?: RobotMovingRoute): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (inMotion) {
          if (stashedMapRef.current == null) {
            stashedMapRef.current = { route: currentRoute, step: currentStep }
          }

          const route = robotMovingRoute ?? ROBOT_IN_MOTION.ROUTE
          const step =
            robotMovingRoute != null
              ? (head(STEP_ORDER[robotMovingRoute]) as RouteStep)
              : ROBOT_IN_MOTION.STEPS.IN_MOTION
          setRecoveryMap({ route, step })
        } else {
          if (stashedMapRef.current != null) {
            setRecoveryMap(stashedMapRef.current)
            stashedMapRef.current = null
          } else {
            setRecoveryMap({
              route: OPTION_SELECTION.ROUTE,
              step: OPTION_SELECTION.STEPS.SELECT,
            })
          }
        }

        resolve()
      })
    },
    [currentRoute, currentStep]
  )

  return { goBackPrevStep, proceedNextStep, proceedToRoute, setRobotInMotion }
}

interface IRecoveryRouteNavigation {
  getNextStep: (step: RouteStep) => RouteStep | typeof INVALID
  getPrevStep: (step: RouteStep) => RouteStep | typeof INVALID
}

// Returns functions that calculate the next and previous steps of a route given a step.
export function getRecoveryRouteNavigation(
  route: RecoveryRoute
): IRecoveryRouteNavigation {
  const getNextStep = (step: RouteStep): RouteStep => {
    const routeSteps = STEP_ORDER[route]
    const isStepFinalStep = step === last(routeSteps)

    if (isStepFinalStep) {
      return INVALID
    } else {
      const stepIndex = routeSteps.indexOf(step)
      return stepIndex !== -1 ? routeSteps[stepIndex + 1] : INVALID
    }
  }

  const getPrevStep = (step: RouteStep): RouteStep | typeof INVALID => {
    const routeSteps = STEP_ORDER[route]
    const isStepFirstStep = step === head(routeSteps)

    if (isStepFirstStep) {
      return INVALID
    } else {
      const stepIndex = routeSteps.indexOf(step)
      return stepIndex !== -1 ? routeSteps[stepIndex - 1] : INVALID
    }
  }

  return { getNextStep, getPrevStep }
}

interface DetermineRecoveryRoutingParams extends GetRouteUpdateActionsParams {
  updatedStep: string
  currentRoute: RecoveryRoute
}

// Determine the valid recovery map given the current step.
// Because RunPausedSplash has access to some ER Wiz routes but is not a part of the ER wizard, the splash
// is the fallback route as opposed to SelectRecoveryOption (ex, accessed by pressing "go back" enough times).
function determineRecoveryRouting({
  hasLaunchedRecovery,
  toggleERWizard,
  setRecoveryMap,
  updatedStep,
  currentRoute,
}: DetermineRecoveryRoutingParams): Promise<void> {
  const { OPTION_SELECTION } = RECOVERY_MAP

  if (updatedStep === INVALID) {
    setRecoveryMap({
      route: OPTION_SELECTION.ROUTE,
      step: OPTION_SELECTION.STEPS.SELECT,
    })

    if (!hasLaunchedRecovery) {
      void toggleERWizard(false)
    }
  } else {
    setRecoveryMap({ route: currentRoute, step: updatedStep })
  }

  return Promise.resolve()
}
