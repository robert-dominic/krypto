export type CoinSymbol = 'BTCUSDT' | 'ETHUSDT' | 'SOLUSDT' | 'BNBUSDT'

export interface CoinTicker {
  symbol: CoinSymbol
  price: number
  priceChange: number
  priceChangePercent: number
  high24h: number
  low24h: number
  volume24h: number
  quoteVolume: number
  lastUpdated: number
}

export interface CandlestickPoint {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface TimeSeriesPoint {
  timestamp: number
  value: number
}

export interface TradeEvent {
  id: string
  symbol: CoinSymbol
  side: 'BUY' | 'SELL'
  price: number
  quantity: number
  total: number
  timestamp: number
  severity: 'low' | 'medium' | 'high'
}

export type StreamStatus = 'connecting' | 'connected' | 'disconnected' | 'error' | 'paused'

export type TimeRange = '1m' | '5m' | '15m' | '1h' | 'live'

export interface ConnectionError {
  code: number
  message: string
  timestamp: number
  retryCount: number
}

export interface MarketSummary {
  totalMarketCap: number
  totalVolume24h: number
  btcDominance: number
  activePairs: number
}

export interface BinanceTickerMessage {
  e: string
  E: number
  s: string
  p: string
  P: string
  c: string
  h: string
  l: string
  v: string
  q: string
}
