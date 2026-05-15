import type { CoinSymbol } from '../types/market.types'

const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatPrice(value: number, _symbol: CoinSymbol): string {
  return usdFormatter.format(value)
}

export function formatChange(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

export function formatVolume(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return value.toFixed(1)
}

export function formatTimestamp(timestamp: number, mode: 'time' | 'datetime' | 'relative'): string {
  const date = new Date(timestamp)

  if (mode === 'time') {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
  }

  if (mode === 'datetime') {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  }

  // relative
  const diffMs = Date.now() - timestamp
  const diffS = Math.floor(diffMs / 1_000)
  if (diffS < 60) return `${diffS}s ago`
  const diffM = Math.floor(diffS / 60)
  if (diffM < 60) return `${diffM}m ago`
  const diffH = Math.floor(diffM / 60)
  return `${diffH}h ago`
}

export function formatQuantity(value: number): string {
  return parseFloat(value.toFixed(6)).toString()
}

export function formatMarketCap(value: number): string {
  if (value >= 1_000_000_000_000) return `$${(value / 1_000_000_000_000).toFixed(2)}T`
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`
  return `$${value.toFixed(2)}`
}

export function isPositive(value: number): boolean {
  return value > 0
}

const COIN_LABELS: Record<CoinSymbol, string> = {
  BTCUSDT: 'Bitcoin',
  ETHUSDT: 'Ethereum',
  SOLUSDT: 'Solana',
  BNBUSDT: 'BNB',
}

const COIN_SHORT_LABELS: Record<CoinSymbol, string> = {
  BTCUSDT: 'BTC',
  ETHUSDT: 'ETH',
  SOLUSDT: 'SOL',
  BNBUSDT: 'BNB',
}

export function getCoinLabel(symbol: CoinSymbol): string {
  return COIN_LABELS[symbol]
}

export function getCoinShortLabel(symbol: CoinSymbol): string {
  return COIN_SHORT_LABELS[symbol]
}

export function getChangeColor(value: number): string {
  if (value > 0) return 'text-accent-green'
  if (value < 0) return 'text-accent-red'
  return 'text-text-secondary'
}
