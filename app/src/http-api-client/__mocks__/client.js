// mock http api client
'use strict'

const client = (module.exports = jest.fn())

client.__setMockResponse = function setMockResponse(...responses) {
  client.mockReset()
  responses.forEach(r => client.mockResolvedValueOnce(r))
}

client.__setMockError = function setMockError(...errors) {
  client.mockReset()
  errors.forEach(e => client.mockRejectedValueOnce(e))
}

client.__clearMock = function clearMockResponses() {
  client.mockReset()
}
