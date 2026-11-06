import type { TradeStatus } from '@poe2/core'

const KNOWN: readonly TradeStatus[] = ['online', 'securable', 'available', 'any']

/** A valid trade2 status, or `online` (the confirmed one) when the value is missing or unrecognised. */
export function tradeStatusOrDefault(value: unknown): TradeStatus {
  return KNOWN.find((s) => s === value) ?? 'online'
}
