import { it, describe, expect } from 'vitest'
import { getMigrationMessage } from '../utils'

const tMock = (key: string) => key

describe('modalContents', () => {
  describe('getMigrationMessage', () => {
    it('should return the v3 migration message when migrating to v3', () => {
      const migrationsList = [
        ['3.0.0'],
        ['3.0.0', '4.0.0'],
        ['3.0.0', '4.0.0', '5.0.0'],
        ['3.0.0', '4.0.0', '5.0.0', '5.1.0'],
        ['3.0.0', '4.0.0', '5.0.0', '5.1.0, 5.2.0'],
      ]
      migrationsList.forEach(migrations => {
        expect(
          JSON.stringify(
            getMigrationMessage({ migrationsRan: migrations, t: tMock })
          )
        ).toEqual(expect.stringContaining('migrations.toV3Migration.title'))
      })
    })
    it('should return the "no behavior change message" when migrating from v5.x to 6', () => {
      const migrationsList = [
        ['5.0.0'],
        ['5.0.0', '5.1.0'],
        ['5.0.0', '5.1.0', '5.2.0'],
      ]
      migrationsList.forEach(migrations => {
        expect(
          JSON.stringify(
            getMigrationMessage({ migrationsRan: migrations, t: tMock })
          )
        ).toEqual(expect.stringContaining('migrations.noBehaviorChange.body1'))
      })
    })
    it('should return the generic migration modal when a v4 migration or v7 migration is required', () => {
      const migrationsList = [
        ['4.0.0'],
        ['4.0.0', '5.0.0'],
        ['4.0.0', '5.0.0', '5.1.0'],
        ['4.0.0', '5.0.0', '5.1.0, 5.2.0'],
        ['6.0.0', '6.1.0', '6.2.0', '6.2.1', '6.2.2'],
      ]
      migrationsList.forEach(migrations => {
        expect(
          JSON.stringify(
            getMigrationMessage({ migrationsRan: migrations, t: tMock })
          )
        ).toEqual(expect.stringContaining('migrations.generic.body1'))
      })
    })
  })
})
