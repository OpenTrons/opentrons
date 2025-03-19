import { describe, it, expect } from 'vitest'
import {
  formatPyStr,
  formatPyValue,
  formatPyWellLocation,
} from '../utils/pythonFormat'

describe('pythonFormat utils', () => {
  it('format string', () => {
    expect(
      formatPyStr(`Funky quotes " '\nNewline\tUnicode µ, Backslash\\`)
    ).toEqual(`"Funky quotes \\" '\\nNewline\\tUnicode µ, Backslash\\\\"`)
  })

  it('format number', () => {
    expect(formatPyValue(3.14)).toBe('3.14')
    expect(formatPyValue(-1e-10)).toBe('-1e-10')
    // this is the valid way to write these values in Python:
    expect(formatPyValue(-1 / 0)).toBe('float("-Infinity")')
    expect(formatPyValue(0 / 0)).toBe('float("NaN")')
  })

  it('format boolean', () => {
    expect(formatPyValue(true)).toBe('True')
    expect(formatPyValue(false)).toBe('False')
  })

  it('format list', () => {
    expect(
      formatPyValue(['hello', 'world', 2.71828, true, false, undefined])
    ).toBe('["hello", "world", 2.71828, True, False, None]')
  })

  it('format dict', () => {
    // null:
    expect(formatPyValue(null)).toBe('None')
    // zero entries:
    expect(formatPyValue({})).toBe('{}')
    // one entry:
    expect(formatPyValue({ one: 'two' })).toBe('{"one": "two"}')
    expect(formatPyValue({ 3: 4 })).toBe('{"3": 4}')
    // multiple entries:
    expect(formatPyValue({ yes: true, no: false })).toBe(
      '{\n    "yes": True,\n    "no": False,\n}'
    )
    // nested entries:
    expect(
      formatPyValue({ hello: 'world', nested: { inner: 5, extra: 6 } })
    ).toBe(
      '{\n    "hello": "world",\n    "nested": {\n        "inner": 5,\n        "extra": 6,\n    },\n}'
    )
  })
})

describe('formatPyWellLocation', () => {
  it('format well location', () => {
    // So many cases to test ...
    expect(formatPyWellLocation(undefined)).toBe('')
    expect(formatPyWellLocation({ origin: 'top' })).toBe('.top()')
    expect(formatPyWellLocation({ origin: 'bottom' })).toBe('.bottom()')
    expect(formatPyWellLocation({ origin: 'center' })).toBe('.center()')
    expect(formatPyWellLocation({ origin: 'meniscus' })).toBe('.meniscus()')

    // Should not emit extranous code if the offset is specified but set to 0:
    expect(
      formatPyWellLocation({ origin: 'top', offset: { x: 0, y: 0, z: 0 } })
    ).toBe('.top()')
    expect(
      formatPyWellLocation({ origin: 'bottom', offset: { x: 0, y: 0, z: 0 } })
    ).toBe('.bottom()')
    expect(
      formatPyWellLocation({ origin: 'center', offset: { x: 0, y: 0, z: 0 } })
    ).toBe('.center()')
    expect(
      formatPyWellLocation({ origin: 'meniscus', offset: { x: 0, y: 0, z: 0 } })
    ).toBe('.meniscus()')

    // Handle z-offsets:
    expect(formatPyWellLocation({ origin: 'top', offset: { z: 2 } })).toBe(
      '.top(z=2)'
    )
    expect(formatPyWellLocation({ origin: 'bottom', offset: { z: 2 } })).toBe(
      '.bottom(z=2)'
    )
    expect(formatPyWellLocation({ origin: 'center', offset: { z: 2 } })).toBe(
      '.center().move(types.Point(z=2))'
    )
    expect(formatPyWellLocation({ origin: 'meniscus', offset: { z: 2 } })).toBe(
      '.meniscus(z=2)'
    )

    // Handle x/y offsets:
    expect(
      formatPyWellLocation({ origin: 'top', offset: { x: 1, y: 2 } })
    ).toBe('.top().move(types.Point(x=1, y=2))')
    expect(
      formatPyWellLocation({ origin: 'bottom', offset: { x: 1, y: 2 } })
    ).toBe('.bottom().move(types.Point(x=1, y=2))')
    expect(
      formatPyWellLocation({ origin: 'center', offset: { x: 1, y: 2 } })
    ).toBe('.center().move(types.Point(x=1, y=2))')
    expect(
      formatPyWellLocation({ origin: 'meniscus', offset: { x: 1, y: 2 } })
    ).toBe('.meniscus().move(types.Point(x=1, y=2))')
  })

  // Handle x/y/z offsets:
  expect(
    formatPyWellLocation({ origin: 'top', offset: { x: 1, y: 2, z: 3 } })
  ).toBe('.top(z=3).move(types.Point(x=1, y=2))')
  expect(
    formatPyWellLocation({ origin: 'bottom', offset: { x: 1, y: 2, z: 3 } })
  ).toBe('.bottom(z=3).move(types.Point(x=1, y=2))')
  expect(
    formatPyWellLocation({ origin: 'center', offset: { x: 1, y: 2, z: 3 } })
  ).toBe('.center().move(types.Point(x=1, y=2, z=3))')
  expect(
    formatPyWellLocation({ origin: 'meniscus', offset: { x: 1, y: 2, z: 3 } })
  ).toBe('.meniscus(z=3).move(types.Point(x=1, y=2))')

  // If origin is missing, treat it as top:
  expect(formatPyWellLocation({ offset: { x: 1, y: 2, z: 3 } })).toBe(
    '.top(z=3).move(types.Point(x=1, y=2))'
  )
})
