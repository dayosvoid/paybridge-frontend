import { describe, expect, it } from 'vitest'
import { formatMajor, formatMoney, parseMajorToMinor } from './money'

describe('formatMajor', () => {
  it('shows minor units as major with two decimals and thousands separators', () => {
    expect(formatMajor(0)).toBe('0.00')
    expect(formatMajor(5)).toBe('0.05')
    expect(formatMajor(1234567)).toBe('12,345.67')
    expect(formatMajor(100000000)).toBe('1,000,000.00')
  })

  it('handles negatives', () => {
    expect(formatMajor(-250)).toBe('-2.50')
  })
})

describe('formatMoney', () => {
  it('adds the currency symbol', () => {
    expect(formatMoney(1234567, 'NGN')).toBe('₦12,345.67')
    expect(formatMoney(6400, 'USD')).toBe('$64.00')
    expect(formatMoney(-6400, 'USD')).toBe('-$64.00')
  })
})

describe('parseMajorToMinor', () => {
  it('turns typed amounts into minor units', () => {
    expect(parseMajorToMinor('12.34')).toBe(1234)
    expect(parseMajorToMinor('1,200')).toBe(120000)
    expect(parseMajorToMinor('5')).toBe(500)
    expect(parseMajorToMinor('0.5')).toBe(50)
    expect(parseMajorToMinor(' 100.00 ')).toBe(10000)
  })

  it('rejects anything that is not a positive amount with at most two decimals', () => {
    for (const bad of ['', 'abc', '-5', '0', '0.00', '1.234', '1.2.3', '12,34,5x', '1e3']) {
      expect(parseMajorToMinor(bad)).toBeNull()
    }
  })

  it('does not lose precision the way floating point would', () => {
    expect(parseMajorToMinor('0.29')).toBe(29)
    expect(parseMajorToMinor('1.15')).toBe(115)
    expect(parseMajorToMinor('19.99')).toBe(1999)
  })
})
