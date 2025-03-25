export const PYTHON_INDENT = '    '
export const JUPYTER_PREFIX =
  'import opentrons.execute\nprotocol = opentrons.execute.get_protocol_api("2.18")\n\n'
export const CLI_PREFIX = `from opentrons import protocol_api\n\nmetadata = {\n${PYTHON_INDENT}"apiLevel": "2.18"\n}\n\ndef run(protocol: protocol_api.ProtocolContext):`
