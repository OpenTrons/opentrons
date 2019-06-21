// @flow
import flow from 'lodash/flow'
import takeRightWhile from 'lodash/takeRightWhile'
import semver from 'semver'
import type { PDProtocolFile } from '../../file-types'
import migrateTo_1_1_0 from './1_1_0'
import migrateTo_3_0_0 from './3_0_0'

export const OLDEST_MIGRATEABLE_VERSION = '1.0.0'

type Version = string
type MigrationsByVersion = { [Version]: (Object) => Object }

const allMigrationsByVersion: MigrationsByVersion = {
  '1.1.0': migrateTo_1_1_0,
  '3.0.0': migrateTo_3_0_0,
}

// get all versions to migrate newer than the file's applicationVersion
export const getMigrationVersionsToRunFromVersion = (
  migrationsByVersion: {},
  version: Version
): Array<Version> => {
  const allSortedVersions = Object.keys(migrationsByVersion).sort(
    semver.compare
  )
  return takeRightWhile(allSortedVersions, v => semver.gt(v, version))
}

const masterMigration = (
  file: any
): { file: PDProtocolFile, didMigrate: boolean } => {
  const designerApplication =
    file.designerApplication || file['designer-application']

  // NOTE: default exists because any protocol that doesn't include the application version
  // key will be treated as the oldest migrateable version ('1.0.0')
  const applicationVersion: string =
    designerApplication.applicationVersion ||
    designerApplication.version ||
    OLDEST_MIGRATEABLE_VERSION

  const migrationVersionsToRun = getMigrationVersionsToRunFromVersion(
    allMigrationsByVersion,
    applicationVersion
  )
  const migratedFile = flow(
    migrationVersionsToRun.map(version => allMigrationsByVersion[version])
  )(file)
  return {
    file: migratedFile,
    didMigrate: migrationVersionsToRun.length > 0,
  }
}

export default masterMigration
