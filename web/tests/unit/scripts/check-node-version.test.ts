import { describe, it, expect } from 'vitest'
import { validateNodeVersion, MIN_MAJOR, MIN_MINOR, MAX_MAJOR_EXCLUSIVE } from '@/scripts/check-node-version'

describe('validateNodeVersion', () => {
  it('accepts the minimum supported version', () => {
    expect(validateNodeVersion(`v${MIN_MAJOR}.${MIN_MINOR}.0`)).toEqual([])
  })

  it('accepts a version above the minimum', () => {
    expect(validateNodeVersion('v22.14.0')).toEqual([])
  })

  it('accepts the latest supported major', () => {
    expect(validateNodeVersion('v26.5.1')).toEqual([])
  })

  it('accepts the highest version in the supported range', () => {
    expect(validateNodeVersion(`v${MAX_MAJOR_EXCLUSIVE - 1}.99.99`)).toEqual([])
  })

  it('rejects a version below the minimum major', () => {
    const errors = validateNodeVersion('v21.0.0')
    expect(errors).toHaveLength(2)
    expect(errors[0]).toContain('too old')
    expect(errors[0]).toContain('22.13')
  })

  it('rejects the minimum major with a too-low minor', () => {
    const errors = validateNodeVersion(`v${MIN_MAJOR}.${MIN_MINOR - 1}.0`)
    expect(errors).toHaveLength(2)
    expect(errors[0]).toContain('too old')
  })

  it('rejects the first unsupported major', () => {
    const errors = validateNodeVersion(`v${MAX_MAJOR_EXCLUSIVE}.0.0`)
    expect(errors).toHaveLength(2)
    expect(errors[0]).toContain('not supported')
    expect(errors[0]).toContain(`<${MAX_MAJOR_EXCLUSIVE}`)
  })

  it('rejects a far-future version', () => {
    const errors = validateNodeVersion('v30.0.0')
    expect(errors).toHaveLength(2)
    expect(errors[0]).toContain('not supported')
  })

  it('handles version strings without a leading v', () => {
    expect(validateNodeVersion('26.5.1')).toEqual([])
  })

  it('accepts the current runtime version', () => {
    expect(validateNodeVersion(process.version)).toEqual([])
  })
})