// config migration tests
import {
  MOCK_CONFIG_V0,
  MOCK_CONFIG_V1,
  MOCK_CONFIG_V2,
  MOCK_CONFIG_V3,
  MOCK_CONFIG_V4,
  MOCK_CONFIG_V5,
  MOCK_CONFIG_V6,
  MOCK_CONFIG_V7,
  MOCK_CONFIG_V8,
} from '../__fixtures__'
import { migrate } from '../migrate'

describe('config migration', () => {
  it('should migrate version 0 to latest', () => {
    const v0Config = MOCK_CONFIG_V0
    const result = migrate(v0Config)

    expect(result.version).toBe(8)
    expect(result).toEqual(MOCK_CONFIG_V8)
  })

  it('should migrate version 1 to latest', () => {
    const v1Config = MOCK_CONFIG_V1
    const result = migrate(v1Config)

    expect(result.version).toBe(8)
    expect(result).toEqual(MOCK_CONFIG_V8)
  })

  it('should migrate version 2 to latest', () => {
    const v2Config = MOCK_CONFIG_V2
    const result = migrate(v2Config)

    expect(result.version).toBe(8)
    expect(result).toEqual(MOCK_CONFIG_V8)
  })

  it('should migrate version 3 to latest', () => {
    const v3Config = MOCK_CONFIG_V3
    const result = migrate(v3Config)

    expect(result.version).toBe(8)
    expect(result).toEqual(MOCK_CONFIG_V8)
  })

  it('should migrate version 4 to latest', () => {
    const v4Config = MOCK_CONFIG_V4
    const result = migrate(v4Config)

    expect(result.version).toBe(8)
    expect(result).toEqual(MOCK_CONFIG_V8)
  })

  it('should migrate version 5 to latest', () => {
    const v5Config = MOCK_CONFIG_V5
    const result = migrate(v5Config)

    expect(result.version).toBe(8)
    expect(result).toEqual(MOCK_CONFIG_V8)
  })

  it('should migrate version 6 to latest', () => {
    const v6Config = MOCK_CONFIG_V6
    const result = migrate(v6Config)

    expect(result.version).toBe(8)
    expect(result).toEqual(MOCK_CONFIG_V8)
  })

  it('should migrate version 7 to latest', () => {
    const v7Config = MOCK_CONFIG_V7
    const result = migrate(v7Config)

    expect(result.version).toBe(8)
    expect(result).toEqual(MOCK_CONFIG_V8)
  })

  it('should keep version 8', () => {
    const v8Config = MOCK_CONFIG_V8
    const result = migrate(v8Config)

    expect(result.version).toBe(8)
    expect(result).toEqual(v8Config)
  })
})
