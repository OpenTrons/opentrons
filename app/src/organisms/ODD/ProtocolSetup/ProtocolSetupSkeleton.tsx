import { BORDERS } from '@opentrons/components'

import { Skeleton } from '/app/atoms/Skeleton'

export function ProtocolSetupTitleSkeleton(): JSX.Element {
  return (
    <>
      <Skeleton
        height="2.25rem"
        width="11.937rem"
        backgroundSize="99rem"
        borderRadius={BORDERS.borderRadius12}
      />
      <Skeleton
        height="2.25rem"
        width="28rem"
        backgroundSize="99rem"
        borderRadius={BORDERS.borderRadius12}
      />
    </>
  )
}

const SetupSkeleton = (): JSX.Element => {
  return (
    <Skeleton
      height="5.5rem"
      width="100%"
      backgroundSize="99rem"
      borderRadius={BORDERS.borderRadius12}
    />
  )
}

export function ProtocolSetupStepSkeleton(): JSX.Element {
  return (
    <>
      <SetupSkeleton />
      <SetupSkeleton />
      <SetupSkeleton />
      <SetupSkeleton />
    </>
  )
}
