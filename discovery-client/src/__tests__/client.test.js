import mdns from 'mdns-js'

import DiscoveryClient from '..'
import * as poller from '../poller'
import * as service from '../service'
import * as serviceList from '../service-list'
import MOCK_BROWSER_SERVICE from '../__fixtures__/mdns-browser-service'
import MOCK_SERVICE from '../__fixtures__/service'

jest.mock('mdns-js')
jest.mock('../poller')

describe('discovery client', () => {
  beforeAll(() => {
    // spies
    service.fromMdnsBrowser = jest.fn(service.fromMdnsBrowser)
    serviceList.createServiceList = jest.fn(serviceList.createServiceList)
  })

  beforeEach(() => {
    mdns.__mockReset()
    jest.clearAllMocks()
  })

  test('start creates mdns browser searching for http', () => {
    const client = DiscoveryClient()
    const result = client.start()

    expect(result).toBe(client)
    expect(mdns.createBrowser).toHaveBeenCalledWith(mdns.tcp('http'))
    expect(mdns.__mockBrowser.discover).not.toHaveBeenCalled()
  })

  test('mdns browser started on ready', () => {
    const client = DiscoveryClient()

    client.start()
    expect(mdns.__mockBrowser.discover).toHaveBeenCalledTimes(0)
    mdns.__mockBrowser.emit('ready')
    expect(mdns.__mockBrowser.discover).toHaveBeenCalledTimes(1)
  })

  test('stops browser on client.stop', () => {
    const client = DiscoveryClient()

    client.start()
    const result = client.stop()
    expect(result).toBe(client)
    expect(mdns.__mockBrowser.stop).toHaveBeenCalled()
  })

  test('stops browser and creates new one on repeated client.start', () => {
    const client = DiscoveryClient()

    client.start()
    expect(mdns.createBrowser).toHaveBeenCalledTimes(1)
    expect(mdns.__mockBrowser.stop).toHaveBeenCalledTimes(0)
    client.start()
    expect(mdns.createBrowser).toHaveBeenCalledTimes(2)
    expect(mdns.__mockBrowser.stop).toHaveBeenCalledTimes(1)
  })

  test('emits "service" if browser finds a service', done => {
    const client = DiscoveryClient()

    client.start()
    client.once('service', results => {
      expect(service.fromMdnsBrowser).toHaveBeenCalledWith(MOCK_BROWSER_SERVICE)
      expect(results).toHaveLength(1)
      expect(results[0]).toEqual({ ...MOCK_SERVICE, advertising: true })
      done()
    })

    mdns.__mockBrowser.emit('update', MOCK_BROWSER_SERVICE)
  }, 10)

  test('adds robot to client.services if browser finds a service', () => {
    const client = DiscoveryClient()

    client.start()
    mdns.__mockBrowser.emit('update', MOCK_BROWSER_SERVICE)
    expect(client.services).toEqual([{ ...MOCK_SERVICE, advertising: true }])
    expect(client.candidates).toEqual([])
  })

  test('new mdns service does not null out ok of existing service', () => {
    const client = DiscoveryClient()

    client.services = [
      {
        ...MOCK_SERVICE,
        ok: true,
        serverOk: true,
        advertising: true,
      },
    ]

    client.start()
    mdns.__mockBrowser.emit('update', MOCK_BROWSER_SERVICE)

    expect(client.services).toEqual([
      {
        ...MOCK_SERVICE,
        ok: true,
        serverOk: true,
        advertising: true,
      },
    ])
  })

  test('services and candidates can be prepopulated', () => {
    const cachedServices = [MOCK_SERVICE]
    const client = DiscoveryClient({
      services: cachedServices,
      candidates: [{ ip: '192.168.1.43', port: 31950 }],
    })

    expect(serviceList.createServiceList).toHaveBeenCalledWith(cachedServices)
    expect(client.services).toEqual(cachedServices)
    expect(client.candidates).toEqual([{ ip: '192.168.1.43', port: 31950 }])
  })

  test('candidates should be deduped by services', () => {
    const client = DiscoveryClient({
      services: [MOCK_SERVICE],
      candidates: [{ ip: MOCK_SERVICE.ip, port: 31950 }],
    })

    expect(client.candidates).toEqual([])
  })

  test('client.start should start polling with default interval 5000', () => {
    const client = DiscoveryClient({
      services: [
        {
          ...MOCK_SERVICE,
          ip: 'foo',
          port: 1,
        },
      ],
      candidates: [{ ip: 'bar', port: 2 }, { ip: 'baz', port: 3 }],
    })

    client.start()
    expect(poller.poll).toHaveBeenCalledWith(
      [{ ip: 'foo', port: 1 }, { ip: 'bar', port: 2 }, { ip: 'baz', port: 3 }],
      5000,
      expect.any(Function),
      client._logger
    )
  })

  test('client should have configurable poll interval', () => {
    const client = DiscoveryClient({
      pollInterval: 1000,
      candidates: [{ ip: 'foo', port: 31950 }],
    })

    client.start()
    expect(poller.poll).toHaveBeenCalledWith(
      expect.anything(),
      1000,
      expect.anything(),
      client._logger
    )
  })

  test('client.stop should stop polling', () => {
    const client = DiscoveryClient({ services: [MOCK_SERVICE] })

    poller.poll.mockReturnValueOnce({ id: 'foobar' })
    client.start()
    client.stop()
    expect(poller.stop).toHaveBeenCalledWith({ id: 'foobar' }, client._logger)
  })

  test('if polls come back good, oks should be flagged true from null', () => {
    const client = DiscoveryClient({ services: [MOCK_SERVICE] })

    client.start()
    const onHealth = poller.poll.mock.calls[0][2]
    onHealth(
      { ip: '192.168.1.42', port: 31950 },
      { name: 'opentrons-dev' },
      { name: 'opentrons-dev' }
    )

    expect(client.services).toHaveLength(1)
    expect(client.services[0].ok).toBe(true)
    expect(client.services[0].serverOk).toBe(true)
  })

  test('if polls come back good, oks should be flagged true from false', () => {
    const client = DiscoveryClient({ services: [MOCK_SERVICE] })

    client.services[0].ok = false
    client.services[0].serverOk = false
    client.start()
    const onHealth = poller.poll.mock.calls[0][2]
    onHealth(
      { ip: '192.168.1.42', port: 31950 },
      { name: 'opentrons-dev' },
      { name: 'opentrons-dev' }
    )

    expect(client.services[0].ok).toBe(true)
    expect(client.services[0].serverOk).toBe(true)
  })

  test('if API health comes back bad, ok should be flagged false from null', () => {
    const client = DiscoveryClient({ services: [MOCK_SERVICE] })

    client.start()
    const onHealth = poller.poll.mock.calls[0][2]
    onHealth({ ip: '192.168.1.42', port: 31950 }, null, {
      name: 'opentrons-dev',
    })
    expect(client.services[0].ok).toBe(false)
    expect(client.services[0].serverOk).toBe(true)
  })

  test('if API health comes back bad, ok should be flagged false from true', () => {
    const client = DiscoveryClient({ services: [MOCK_SERVICE] })

    client.services[0].ok = true
    client.start()
    const onHealth = poller.poll.mock.calls[0][2]
    onHealth({ ip: '192.168.1.42', port: 31950 }, null, {
      name: 'opentrons-dev',
    })
    expect(client.services[0].ok).toBe(false)
    expect(client.services[0].serverOk).toBe(true)
  })

  test('if /server health comes back bad, serverOk should be flagged false from null', () => {
    const client = DiscoveryClient({ services: [MOCK_SERVICE] })

    client.start()
    const onHealth = poller.poll.mock.calls[0][2]
    onHealth(
      { ip: '192.168.1.42', port: 31950 },
      { name: 'opentrons-dev' },
      null
    )

    expect(client.services[0].ok).toBe(true)
    expect(client.services[0].serverOk).toBe(false)
  })

  test('if /server health comes back bad, serverOk should be flagged false from true', () => {
    const client = DiscoveryClient({ services: [MOCK_SERVICE] })

    client.services[0].serverOk = true
    client.start()
    const onHealth = poller.poll.mock.calls[0][2]
    onHealth(
      { ip: '192.168.1.42', port: 31950 },
      { name: 'opentrons-dev' },
      null
    )

    expect(client.services[0].ok).toBe(true)
    expect(client.services[0].serverOk).toBe(false)
  })

  test('if both polls comes back bad, oks should be flagged false from null', () => {
    const client = DiscoveryClient({ services: [MOCK_SERVICE] })

    client.start()
    const onHealth = poller.poll.mock.calls[0][2]
    onHealth({ ip: '192.168.1.42', port: 31950 }, null, null)

    expect(client.services).toHaveLength(1)
    expect(client.services[0].ok).toBe(false)
    expect(client.services[0].serverOk).toBe(false)
  })

  test('if both polls comes back bad, oks should be flagged false from true', () => {
    const client = DiscoveryClient({ services: [MOCK_SERVICE] })

    client.services[0].ok = true
    client.services[0].serverOk = true
    client.start()
    const onHealth = poller.poll.mock.calls[0][2]
    onHealth({ ip: '192.168.1.42', port: 31950 }, null, null)

    expect(client.services).toHaveLength(1)
    expect(client.services[0].ok).toBe(false)
    expect(client.services[0].serverOk).toBe(false)
  })

  test('if names come back conflicting, prefer /server and set ok to false', () => {
    const client = DiscoveryClient({ services: [MOCK_SERVICE] })

    client.start()
    const onHealth = poller.poll.mock.calls[0][2]
    onHealth(
      { ip: '192.168.1.42', port: 31950 },
      { name: 'something-else' },
      { name: 'opentrons-dev' }
    )

    expect(client.services[0].ok).toBe(false)
    expect(client.services[0].serverOk).toBe(true)
  })

  test('if health comes back for a candidate, it should be promoted', () => {
    const client = DiscoveryClient({
      candidates: [{ ip: '192.168.1.42', port: 31950 }],
    })

    client.start()
    const onHealth = poller.poll.mock.calls[0][2]
    onHealth(
      { ip: '192.168.1.42', port: 31950 },
      { name: 'opentrons-dev' },
      { name: 'opentrons-dev' }
    )

    expect(client.candidates).toEqual([])
    expect(client.services).toEqual([
      {
        ...MOCK_SERVICE,
        ok: true,
        serverOk: true,
        health: { name: 'opentrons-dev' },
        serverHealth: { name: 'opentrons-dev' },
      },
    ])
  })

  test('if health comes back with IP conflict, null out old services', () => {
    const client = DiscoveryClient()

    client.services = [
      { ...MOCK_SERVICE, name: 'bar', ok: true, serverOk: true },
      { ...MOCK_SERVICE, name: 'baz', ok: true, serverOk: true },
    ]

    client.start()
    const onHealth = poller.poll.mock.calls[0][2]
    onHealth(
      { ip: MOCK_SERVICE.ip, port: 31950 },
      { name: 'opentrons-dev' },
      { name: 'opentrons-dev' }
    )

    expect(client.services).toEqual([
      {
        ...MOCK_SERVICE,
        ok: true,
        serverOk: true,
        health: { name: 'opentrons-dev' },
        serverHealth: { name: 'opentrons-dev' },
      },
      { ...MOCK_SERVICE, name: 'bar', ip: null, local: null },
      { ...MOCK_SERVICE, name: 'baz', ip: null, local: null },
    ])
  })

  test('if new service is added, poller is restarted', () => {
    const client = DiscoveryClient({
      candidates: [{ ip: '192.168.1.1', port: 31950 }],
    })

    poller.poll.mockReturnValueOnce({ id: 1234 })

    client.start()
    expect(poller.poll).toHaveBeenLastCalledWith(
      [{ ip: '192.168.1.1', port: 31950 }],
      expect.anything(),
      expect.anything(),
      client._logger
    )

    client.once('service', robot => {
      expect(poller.stop).toHaveBeenLastCalledWith({ id: 1234 }, client._logger)
      expect(poller.poll).toHaveBeenLastCalledWith(
        [
          { ip: '192.168.1.42', port: 31950 },
          { ip: '192.168.1.1', port: 31950 },
        ],
        expect.anything(),
        expect.anything(),
        client._logger
      )
    })

    mdns.__mockBrowser.emit('update', MOCK_BROWSER_SERVICE)
  })

  test('services may be removed and removes candidates', () => {
    const client = DiscoveryClient({
      services: [
        {
          ...MOCK_SERVICE,
          ip: '192.168.1.42',
          port: 31950,
        },
        {
          ...MOCK_SERVICE,
          ip: '[fd00:0:cafe:fefe::1]',
          port: 31950,
        },
      ],
    })

    client.start()
    const result = client.remove('opentrons-dev')
    expect(result).toBe(client)
    expect(client.services).toEqual([])
    expect(client.candidates).toEqual([])
  })

  test('candidate removal restarts poll', () => {
    const client = DiscoveryClient({ services: [MOCK_SERVICE] })

    poller.poll.mockReturnValueOnce({ id: 1234 })
    client.start()
    client.remove('opentrons-dev')
    expect(poller.stop).toHaveBeenLastCalledWith({ id: 1234 }, client._logger)
    expect(poller.poll).toHaveBeenLastCalledWith(
      [],
      expect.anything(),
      expect.anything(),
      client._logger
    )
  })

  test('candidate removal emits removal events', done => {
    const services = [
      {
        ...MOCK_SERVICE,
        ip: '[fd00:0:cafe:fefe::1]',
        port: 31950,
        local: true,
      },
      MOCK_SERVICE,
    ]

    const client = DiscoveryClient({ services })

    client.on('serviceRemoved', results => {
      expect(results).toEqual(services)
      done()
    })

    client.start()
    client.remove('opentrons-dev')
  }, 10)

  test('passes along mdns errors', done => {
    const mockError = new Error('AH')
    const client = DiscoveryClient().once('error', error => {
      expect(error).toEqual(mockError)
      done()
    })

    client.start()
    mdns.__mockBrowser.emit('error', mockError)
  })

  test('can filter services by name', () => {
    const client = DiscoveryClient({ nameFilter: ['OPENTRONS'] })

    client.start()
    mdns.__mockBrowser.emit('update', MOCK_BROWSER_SERVICE)
    mdns.__mockBrowser.emit('update', {
      ...MOCK_BROWSER_SERVICE,
      addresses: ['192.168.1.1'],
      fullname: 'Opentrons-2._http._tcp.local',
    })
    mdns.__mockBrowser.emit('update', {
      ...MOCK_BROWSER_SERVICE,
      addresses: ['192.168.1.2'],
      fullname: 'apentrons._http._tcp.local',
    })

    expect(client.services.map(s => s.name)).toEqual([
      'opentrons-dev',
      'Opentrons-2',
    ])
  })

  test('can filter services by ip', () => {
    const client = DiscoveryClient({ ipFilter: ['169.254'] })

    client.start()
    mdns.__mockBrowser.emit('update', {
      ...MOCK_BROWSER_SERVICE,
      addresses: ['169.254.1.2'],
    })
    mdns.__mockBrowser.emit('update', {
      ...MOCK_BROWSER_SERVICE,
      addresses: ['192.168.3.4'],
    })

    expect(client.services.map(s => s.ip)).toEqual(['169.254.1.2'])
  })

  test('can filter services by port', () => {
    const client = DiscoveryClient({ portFilter: [31950, 31951] })

    client.start()
    mdns.__mockBrowser.emit('update', MOCK_BROWSER_SERVICE)
    mdns.__mockBrowser.emit('update', {
      ...MOCK_BROWSER_SERVICE,
      fullname: '2._http._tcp.local',
      addresses: ['192.168.1.1'],
      port: 31951,
    })
    mdns.__mockBrowser.emit('update', {
      ...MOCK_BROWSER_SERVICE,
      fullname: '3._http._tcp.local',
      addresses: ['192.168.1.2'],
      port: 22,
    })

    expect(client.services.map(s => s.port)).toEqual([31950, 31951])
  })

  test('can add a candidate manually (with deduping)', () => {
    const client = DiscoveryClient()
    const result = client.add('localhost').add('localhost')

    const expectedCandidates = [{ ip: 'localhost', port: 31950 }]
    expect(result).toBe(client)
    expect(client.candidates).toEqual(expectedCandidates)
    expect(poller.poll).toHaveBeenLastCalledWith(
      expectedCandidates,
      expect.anything(),
      expect.anything(),
      client._logger
    )
  })

  test('can change polling interval on the fly', () => {
    const client = DiscoveryClient({ candidates: ['localhost'] })
    const expectedCandidates = [{ ip: 'localhost', port: 31950 }]

    let result = client.setPollInterval(1000)
    expect(result).toBe(client)
    expect(poller.poll).toHaveBeenLastCalledWith(
      expectedCandidates,
      1000,
      expect.anything(),
      client._logger
    )

    client.setPollInterval(0)
    expect(poller.poll).toHaveBeenLastCalledWith(
      expectedCandidates,
      5000,
      expect.anything(),
      client._logger
    )
  })

  test.skip('periodically refreshes mDNS discovery', () => {
    // TODO(mc, 2018-10-08): write this test
  })
})
