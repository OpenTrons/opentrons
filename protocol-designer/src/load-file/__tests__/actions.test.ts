import { describe, it, expect, vi, afterEach } from 'vitest'
import { createFile } from '/protocol-designer/file-data/selectors/fileCreator'
import { getFileMetadata } from '/protocol-designer/file-data/selectors/fileFields'
import { saveProtocolFile } from '../actions'
import { saveFile as saveFileUtil } from '../utils'

vi.mock('/protocol-designer/file-data/selectors/fileCreator')
vi.mock('/protocol-designer/file-data/selectors/fileFields')
vi.mock('../utils')

afterEach(() => {
  vi.resetAllMocks()
})
describe('saveProtocolFile thunk', () => {
  it('should dispatch SAVE_PROTOCOL_FILE and then call saveFile util', () => {
    const fakeState = {}
    const mockFileData = {}
    let actionWasDispatched = false
    vi.mocked(createFile).mockImplementation(state => {
      expect(state).toBe(fakeState)
      expect(actionWasDispatched).toBe(true)
      return mockFileData as any
    })
    vi.mocked(getFileMetadata).mockImplementation(state => {
      expect(state).toBe(fakeState)
      expect(actionWasDispatched).toBe(true)
      return {
        protocolName: 'fooFileName',
      }
    })
    vi.mocked(saveFileUtil).mockImplementation((fileData, fileName) => {
      expect(fileName).toEqual('fooFileName.json')
      expect(fileData).toBe(mockFileData)
    })
    const dispatch: () => any = vi.fn().mockImplementation(action => {
      expect(action).toEqual({
        type: 'SAVE_PROTOCOL_FILE',
      })
      actionWasDispatched = true
    })
    const getState: () => any = vi.fn().mockImplementation(() => {
      // once we call getState, the thunk should already have dispatched the action
      expect(actionWasDispatched).toBe(true)
      return fakeState
    })
    saveProtocolFile()(dispatch, getState)
    expect(dispatch).toHaveBeenCalled()
    expect(vi.mocked(createFile)).toHaveBeenCalled()
    expect(vi.mocked(getFileMetadata)).toHaveBeenCalled()
    expect(getState).toHaveBeenCalled()
    expect(vi.mocked(saveFileUtil)).toHaveBeenCalled()
  })
})
