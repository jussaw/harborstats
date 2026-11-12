import { describe, it, expect } from 'vitest'
import { cellsMatch } from '@/scripts/verify-migration'

describe('cellsMatch', () => {
  it('matches NULL only with NULL', () => {
    expect(cellsMatch('text', null, { value: null, type: 'null' })).toBe(true)
    expect(cellsMatch('text', null, { value: '', type: 'text' })).toBe(false)
    expect(cellsMatch('text', '', { value: null, type: 'null' })).toBe(false)
  })

  it('requires integers stored as INTEGER, not REAL or text', () => {
    expect(cellsMatch('integer', 51, { value: 51, type: 'integer' })).toBe(true)
    expect(cellsMatch('integer', 51, { value: 51, type: 'real' })).toBe(false)
    expect(cellsMatch('integer', 51, { value: '51', type: 'text' })).toBe(false)
    expect(cellsMatch('integer', 51, { value: 52, type: 'integer' })).toBe(false)
  })

  it('matches booleans to 0/1 integers', () => {
    expect(cellsMatch('boolean', true, { value: 1, type: 'integer' })).toBe(true)
    expect(cellsMatch('boolean', false, { value: 0, type: 'integer' })).toBe(true)
    expect(cellsMatch('boolean', true, { value: 0, type: 'integer' })).toBe(false)
    expect(cellsMatch('boolean', false, { value: 'false', type: 'text' })).toBe(false)
  })

  it('compares timestamps as exact microsecond text in the stored form', () => {
    const ts = '2026-11-12T04:34:59.485225Z'
    expect(cellsMatch('timestamp with time zone', ts, { value: ts, type: 'text' })).toBe(true)
    expect(
      cellsMatch('timestamp with time zone', ts, {
        value: '2026-11-12T04:34:59.485226Z',
        type: 'text',
      }),
    ).toBe(false)
    expect(
      cellsMatch('timestamp with time zone', ts, { value: '2026-11-12T04:34:59.485Z', type: 'text' }),
    ).toBe(false)
  })

  it('compares inet host text exactly', () => {
    expect(cellsMatch('inet', '2001:db8::1', { value: '2001:db8::1', type: 'text' })).toBe(true)
    expect(cellsMatch('inet', '2001:db8::1', { value: '2001:DB8::1', type: 'text' })).toBe(false)
  })

  it('compares jsonb structurally, ignoring whitespace and key order', () => {
    expect(
      cellsMatch('jsonb', '{"a": 1, "b": [true, null]}', {
        value: '{"b":[true,null],"a":1}',
        type: 'text',
      }),
    ).toBe(true)
    expect(cellsMatch('jsonb', '{"a": 1}', { value: '{"a":"1"}', type: 'text' })).toBe(false)
    expect(cellsMatch('jsonb', '{"a": 1}', { value: 'not json', type: 'text' })).toBe(false)
  })

  it('compares text exactly', () => {
    expect(cellsMatch('text', 'Ana', { value: 'Ana', type: 'text' })).toBe(true)
    expect(cellsMatch('text', 'Ana', { value: 'ana', type: 'text' })).toBe(false)
  })

  it('refuses a Postgres type it does not know how to compare', () => {
    expect(() => cellsMatch('numeric', '1.5', { value: 1.5, type: 'real' })).toThrow(/numeric/)
  })
})
