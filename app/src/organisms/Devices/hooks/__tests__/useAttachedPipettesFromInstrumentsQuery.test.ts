import { useAttachedPipettesFromInstrumentsQuery } from '..'
import {
  pipetteDataLeftFixture,
  pipetteResponseRightFixture,
} from '@opentrons/api-client'
import { useInstrumentsQuery } from '@opentrons/react-api-client'
import { renderHook } from '@testing-library/react-hooks'
import * as React from 'react'

jest.mock('@opentrons/react-api-client')

const mockUseInstrumentsQuery = useInstrumentsQuery as jest.MockedFunction<
  typeof useInstrumentsQuery
>
describe('useAttachedPipettesFromInstrumentsQuery hook', () => {
  let wrapper: React.FunctionComponent<{}>
  it('returns attached pipettes', () => {
    mockUseInstrumentsQuery.mockReturnValue({
      data: {
        data: [pipetteDataLeftFixture, pipetteResponseRightFixture],
      },
    } as any)

    const { result } = renderHook(
      () => useAttachedPipettesFromInstrumentsQuery(),
      {
        wrapper,
      }
    )

    expect(result.current).toEqual({
      left: {
        ...pipetteDataLeftFixture,
        displayName: 'Flex 1-Channel 1000 μL',
      },
      right: {
        ...pipetteResponseRightFixture,
        displayName: 'Flex 1-Channel 1000 μL',
      },
    })
  })
})
