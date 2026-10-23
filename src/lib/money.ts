import type { Currency } from '../api/types'

/** All amounts from the API are whole minor units (kobo, cents). Never use floating point for money. */

const SYMBOL: Record<Currency, string> = { NGN: '₦', USD: '$' }

/** 1234567 -> "12,345.67" */
export function formatMajor(minor: number): string {
  const negative = minor < 0
  const abs = Math.abs(minor)
  const whole = Math.floor(abs / 100)
  const cents = String(abs % 100).padStart(2, '0')
  const grouped = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${negative ? '-' : ''}${grouped}.${cents}`
}

/** 1234567, 'NGN' -> "₦12,345.67" */
export function formatMoney(minor: number, currency: Currency): string {
  const text = formatMajor(minor)
  return text.startsWith('-') ? `-${SYMBOL[currency]}${text.slice(1)}` : `${SYMBOL[currency]}${text}`
}

/**
 * What a person types ("12.34", "1,200", "5") -> minor units (1234, 120000, 500).
 * Returns null for anything that is not a positive amount with at most two decimals.
 */
export function parseMajorToMinor(input: string): number | null {
  const cleaned = input.trim().replace(/,/g, '')
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(cleaned)
  if (!match) {
    return null
  }
  const whole = Number(match[1])
  const cents = Number((match[2] ?? '').padEnd(2, '0'))
  const minor = whole * 100 + cents
  if (!Number.isSafeInteger(minor) || minor <= 0) {
    return null
  }
  return minor
}
