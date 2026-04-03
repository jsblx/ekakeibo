import { describe, it, expect } from 'vitest'
import { formatCurrency, parseNumber } from './formatCurrency.js'

describe('formatCurrency', () => {
  it('formats positive integers', () => {
    expect(formatCurrency(1234)).toBe('$1,234')
  })

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('$0')
  })

  it('rounds to no decimal places', () => {
    expect(formatCurrency(1234.56)).toBe('$1,235')
  })

  it('formats negative values', () => {
    expect(formatCurrency(-500)).toBe('-$500')
  })
})

describe('parseNumber', () => {
  it('parses plain numbers', () => {
    expect(parseNumber('1234')).toBe(1234)
  })

  it('strips currency symbols and commas', () => {
    expect(parseNumber('$1,234.56')).toBe(1234.56)
  })

  it('parses negative values', () => {
    expect(parseNumber('-45.67')).toBe(-45.67)
  })

  it('returns 0 for empty string', () => {
    expect(parseNumber('')).toBe(0)
  })

  it('returns 0 for non-numeric strings', () => {
    expect(parseNumber('N/A')).toBe(0)
  })
})
