// config migration tests
import {
  MOCK_CONFIG_V12,
  MOCK_CONFIG_V13,
  MOCK_CONFIG_V14,
  MOCK_CONFIG_V15,
} from '../__fixtures__'
import { migrate } from '../migrate'

describe('config migration', () => {
  it('should migrate version 12 to latest', () => {
    const v12Config = MOCK_CONFIG_V12
    const result = migrate(v12Config)

    expect(result.version).toBe(15)
    expect(result).toEqual(MOCK_CONFIG_V15)
  })

  it('should migrate version 13 to latest', () => {
    const v13Config = MOCK_CONFIG_V13
    const result = migrate(v13Config)

    expect(result.version).toBe(15)
    expect(result).toEqual(MOCK_CONFIG_V15)
  })

  it('should migrate version 14 to latest', () => {
    const v14Config = MOCK_CONFIG_V14
    const result = migrate(v14Config)

    expect(result.version).toBe(15)
    expect(result).toEqual(MOCK_CONFIG_V15)
  })

  it('should keep version 15', () => {
    const v15Config = MOCK_CONFIG_V15
    const result = migrate(v15Config)

    expect(result.version).toBe(15)
    expect(result).toEqual(v15Config)
  })
})
