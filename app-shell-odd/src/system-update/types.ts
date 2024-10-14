export interface ReleaseSetUrls {
  fullImage: string
  system: string
  version: string
  releaseNotes?: string
}

export interface ReleaseManifest {
  production: {
    [version: string]: ReleaseSetUrls
  }
}

export interface ReleaseSetFilepaths {
  system: string
  releaseNotes: string | null
}

// shape of VERSION.json in update file
export interface VersionInfo {
  buildroot_version: string
  buildroot_sha: string
  buildroot_branch: string
  buildroot_buildid: string
  build_type: string
  opentrons_api_version: string
  opentrons_api_sha: string
  opentrons_api_branch: string
  update_server_version: string
  update_server_sha: string
  update_server_branch: string
}

export interface UserFileInfo {
  // filepath of update file
  systemFile: string
  // parsed contents of VERSION.json
  versionInfo: VersionInfo
}

export interface NoUpdate {
  version: null
  files: null
  releaseNotes: null
  downloadProgress: 0
}

export interface FoundUpdate {
  version: string
  files: null
  releaseNotes: null
  downloadProgress: number
}

export interface ReadyUpdate {
  version: string
  files: ReleaseSetFilepaths
  releaseNotes: string | null
  downloadProgress: 100
}

export type ResolvedUpdate = NoUpdate | ReadyUpdate
export type UnresolvedUpdate = ResolvedUpdate | FoundUpdate
export type ProgressCallback = (status: UnresolvedUpdate) => void

// Interface provided by the web and usb sourced updaters. Type variable is
// specified by the updater implementation.
export interface UpdateProvider<UpdateSourceDetails> {
  // Call before disposing to make sure any temporary storage is removed
  teardown: () => Promise<void>
  // Scan an implementation-defined location for updates
  refreshUpdateCache: (progress: ProgressCallback) => Promise<ResolvedUpdate>
  // Get the details of a found update, if any.
  getUpdateDetails: () => UnresolvedUpdate
  // Lock the update cache, which will prevent anything from accidentally overwriting stuff
  // while it's being sent as an update
  lockUpdateCache: () => void
  // Reverse lockUpdateCache()
  unlockUpdateCache: () => void
  // get an identifier for logging
  name: () => string
  // get the current source
  source: () => UpdateSourceDetails
}
