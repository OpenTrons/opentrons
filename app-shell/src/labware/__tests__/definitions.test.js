// @flow
// tests for labware directory utilities

import path from 'path'
import fs from 'fs-extra'
import tempy from 'tempy'
import Electron from 'electron'

import {
  readLabwareDirectory,
  parseLabwareFiles,
  addLabwareFile,
  removeLabwareFile,
} from '../definitions'

jest.mock('electron')

describe('labware directory utilities', () => {
  const tempDirs: Array<string> = []
  const makeEmptyDir = (): string => {
    const dir: string = tempy.directory()
    tempDirs.push(dir)
    return dir
  }

  afterAll(() => {
    return Promise.all(tempDirs.map(d => fs.remove(d)))
  })

  describe('readLabwareDirectory', () => {
    test('resolves empty array for empty directory', () => {
      const dir = makeEmptyDir()
      return expect(readLabwareDirectory(dir)).resolves.toEqual([])
    })

    test('rejects if directory is not found', () => {
      return expect(
        readLabwareDirectory('__not_a_directory__')
      ).rejects.toThrow(/no such file/)
    })

    test('returns paths to JSON files in directory', () => {
      const dir = makeEmptyDir()

      return Promise.all([
        fs.writeJson(path.join(dir, 'a.json'), { name: 'a' }),
        fs.writeJson(path.join(dir, 'b.json'), { name: 'b' }),
        fs.writeJson(path.join(dir, 'c.json'), { name: 'c' }),
      ]).then(() => {
        return expect(readLabwareDirectory(dir)).resolves.toEqual([
          path.join(dir, 'a.json'),
          path.join(dir, 'b.json'),
          path.join(dir, 'c.json'),
        ])
      })
    })

    test('returns paths to nested JSON files in directory', () => {
      const dir = makeEmptyDir()
      const nested = path.join(dir, 'nested')

      return fs
        .ensureDir(nested)
        .then(() => {
          return Promise.all([
            fs.writeJson(path.join(nested, 'a.json'), { name: 'a' }),
            fs.writeJson(path.join(dir, 'b.json'), { name: 'b' }),
            fs.writeJson(path.join(dir, 'c.json'), { name: 'c' }),
          ])
        })
        .then(() => {
          return expect(readLabwareDirectory(dir)).resolves.toEqual([
            path.join(dir, 'b.json'),
            path.join(dir, 'c.json'),
            path.join(nested, 'a.json'),
          ])
        })
    })
  })

  describe('parseLabwareFiles', () => {
    test('reads and parses JSON files', () => {
      const dir = makeEmptyDir()
      const files = [
        path.join(dir, 'a.json'),
        path.join(dir, 'b.json'),
        path.join(dir, 'c.json'),
      ]

      return Promise.all([
        fs.writeJson(files[0], { name: 'a' }),
        fs.writeJson(files[1], { name: 'b' }),
        fs.writeJson(files[2], { name: 'c' }),
      ]).then(() => {
        return expect(parseLabwareFiles(files)).resolves.toEqual([
          {
            filename: files[0],
            data: { name: 'a' },
            created: expect.any(Number),
          },
          {
            filename: files[1],
            data: { name: 'b' },
            created: expect.any(Number),
          },
          {
            filename: files[2],
            data: { name: 'c' },
            created: expect.any(Number),
          },
        ])
      })
    })

    test('surfaces parse errors as null data', () => {
      const dir = makeEmptyDir()
      const files = [
        path.join(dir, 'a.json'),
        path.join(dir, 'b.json'),
        path.join(dir, 'c.json'),
      ]

      return Promise.all([
        fs.writeJson(files[0], { name: 'a' }),
        fs.writeFile(files[1], `this isn't JSON!!!`),
        fs.writeJson(files[2], { name: 'c' }),
      ]).then(() => {
        return expect(parseLabwareFiles(files)).resolves.toEqual([
          {
            filename: files[0],
            data: { name: 'a' },
            created: expect.any(Number),
          },
          { filename: files[1], data: null, created: expect.any(Number) },
          {
            filename: files[2],
            data: { name: 'c' },
            created: expect.any(Number),
          },
        ])
      })
    })
  })

  describe('addLabwareFile', () => {
    test('writes a labware file to the directory', () => {
      const sourceDir = makeEmptyDir()
      const destDir = makeEmptyDir()
      const sourceName = path.join(sourceDir, 'source.json')
      const expectedName = path.join(destDir, 'source.json')

      return fs
        .writeJson(sourceName, { name: 'a' })
        .then(() => addLabwareFile(sourceName, destDir))
        .then(() => readLabwareDirectory(destDir))
        .then(parseLabwareFiles)
        .then(files => {
          expect(files).toEqual([
            {
              filename: expectedName,
              data: { name: 'a' },
              created: expect.any(Number),
            },
          ])
        })
    })

    test('increments filename to avoid collisions', () => {
      const sourceDir = makeEmptyDir()
      const destDir = makeEmptyDir()
      const sourceName = path.join(sourceDir, 'source.json')
      const collision1 = path.join(destDir, 'source.json')
      const collision2 = path.join(destDir, 'source1.json')
      const expectedName = path.join(destDir, 'source2.json')

      const setup = Promise.all([
        fs.writeJson(sourceName, { name: 'a' }),
        fs.writeJson(collision1, { name: 'b' }),
        fs.writeJson(collision2, { name: 'c' }),
      ])

      return setup
        .then(() => addLabwareFile(sourceName, destDir))
        .then(() => readLabwareDirectory(destDir))
        .then(parseLabwareFiles)
        .then(files => {
          expect(files).toContainEqual({
            filename: expectedName,
            data: { name: 'a' },
            created: expect.any(Number),
          })
        })
    })
  })

  describe('remove labware file', () => {
    test('calls Electron.shell.moveItemToTrash', () => {
      const dir = makeEmptyDir()
      const filename = path.join(dir, 'foo.json')

      Electron.shell.moveItemToTrash.mockReturnValue(true)

      return removeLabwareFile(filename).then(() => {
        expect(Electron.shell.moveItemToTrash).toHaveBeenCalledWith(filename)
      })
    })

    test('deletes the file if Electron fails to trash it', () => {
      const dir = makeEmptyDir()
      const filename = path.join(dir, 'foo.json')
      const setup = fs.writeJson(filename, { name: 'a' })

      Electron.shell.moveItemToTrash.mockReturnValue(false)

      return setup
        .then(() => removeLabwareFile(filename))
        .then(() => readLabwareDirectory(dir))
        .then(files => expect(files).toEqual([]))
    })
  })
})
