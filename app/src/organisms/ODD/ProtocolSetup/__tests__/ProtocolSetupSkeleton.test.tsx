import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import {
  ProtocolSetupTitleSkeleton,
  ProtocolSetupStepSkeleton,
} from '../ProtocolSetupSkeleton'

describe('ProtocolSetupSkeleton', () => {
  it('renders Skeletons to replace the title section', () => {
    render(<ProtocolSetupTitleSkeleton />)
    const titleSkeletons = screen.getAllByTestId('Skeleton')
    expect(titleSkeletons.length).toBe(2)

    titleSkeletons.forEach(titleSkeleton => {
      expect(titleSkeleton).toHaveStyle('background-size: 99rem')
    })
  })

  it('renders Skeletons to replace the SetupStep components', () => {
    render(<ProtocolSetupStepSkeleton />)
    const titleSkeletons = screen.getAllByTestId('Skeleton')
    expect(titleSkeletons.length).toBe(4)

    titleSkeletons.forEach(titleSkeleton => {
      expect(titleSkeleton).toHaveStyle('background-size: 99rem')
    })
  })
})
