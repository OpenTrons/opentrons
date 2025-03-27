import { saveAs } from 'file-saver'
import type { ProtocolFile } from '@opentrons/shared-data'
export const saveFile = (fileData: ProtocolFile, fileName: string): void => {
  const blob = new Blob([JSON.stringify(fileData, null, 2)], {
    type: 'application/json',
  })
  saveAs(blob, fileName)
}
export const savePythonFile = (fileData: string, fileName: string): void => {
  const highlighted = `
<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/python.min.js"></script>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/default.min.css">
<style>.reveal pre code, .hljs { background-color: unset; }</style>
<pre><code class="language-python">${fileData}</code></pre>
<script>hljs.highlightAll();</script>
`.trimStart()
  const blob = new Blob([highlighted], { type: 'text/html;charset=UTF-8' })
  // For now, show the generated Python in a new window instead of saving it to a file.
  // (A saved Python file wouldn't be runnable anyway until we finish this project.)
  window.open(URL.createObjectURL(blob), '_blank')
}
