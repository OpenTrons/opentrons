import { saveAs } from 'file-saver'
import type { ProtocolFile } from '@opentrons/shared-data'
export const saveFile = (fileData: ProtocolFile, fileName: string): void => {
  const blob = new Blob([JSON.stringify(fileData, null, 2)], {
    type: 'application/json',
  })
  saveAs(blob, fileName)
}
export const savePythonFile = (fileData: string, fileName: string): void => {
  const blob = new Blob([fileData], { type: 'text/x-python;charset=UTF-8' })
  // For now, show the generated Python in a new window instead of saving it to a file.
  // (A saved Python file wouldn't be runnable anyway until we finish this project.)
  window.open(URL.createObjectURL(blob), '_blank')
}
