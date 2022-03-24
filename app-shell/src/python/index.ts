import path from 'path'
import fs from 'fs-extra'
import execa from 'execa'

import { createLogger } from '../log'
import { getConfig } from '../config'

const log = createLogger('python')

function findPython(): string | undefined {
  const pathToPythonOverride: string | null = getConfig('python')
    .pathToPythonOverride

  let possiblePythonPaths = [
    path.join(process.resourcesPath, 'python'),
    path.join(process.resourcesPath, 'python', 'bin', 'python3'),
  ]

  log.debug('IN FIND PYTHON', { pathToPythonOverride })
  if (pathToPythonOverride != null) {
    possiblePythonPaths = [
      pathToPythonOverride,
      path.join(pathToPythonOverride, 'bin/python3'),
      ...possiblePythonPaths,
    ]
  }

  if (process.env.NODE_ENV !== 'production') {
    possiblePythonPaths = [
      ...possiblePythonPaths,
      path.join(__dirname, '../python/bin/python3'),
    ]
  }

  for (const path of possiblePythonPaths) {
    try {
      fs.accessSync(path, fs.constants.X_OK)
      const stats = fs.statSync(path)
      if (stats.isFile()) {
        log.debug('Python candidate selected', { path })
        return path
      }
    } catch (error) {
      log.debug('Python candidate not executable, skipping', { path, error })
    }
  }
}

export function runFileWithPython(
  srcFilePath: string,
  destFilePath: string
): Promise<void> {
  const pythonPath = findPython()

  log.debug('IN RUN FILE WITH PYTHON', { pythonPath, srcFilePath })
  if (pythonPath != null) {
    log.debug('BEFORE PYTHON IS EXECUTED', pythonPath, srcFilePath)
    execa(pythonPath, [
      '-m',
      'opentrons.cli.__init__',
      'analyze',
      '--json',
      srcFilePath,
    ])
      .then(output => {
        log.info('python out', output)
        fs.writeJSON(destFilePath, JSON.stringify(output.stdout))
      })
      .catch(log.error)
  } else {
    return Promise.reject(new Error('Python interpreter could not be found'))
  }
}
