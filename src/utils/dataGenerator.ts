import type {
  CoinSymbol,
  CandlestickPoint,
  CoinTicker,
  TradeEvent,
  MarketSummary,
} from '../types/market.types'

const BASE_PRICES: Record<CoinSymbol, number> = {
  BTCUSDT: 65000,
  ETHUSDT: 3500,
  SOLUSDT: 150,
  BNBUSDT: 580,
}

const MAX_MOVE = 0.003 // 0.3% max move per candle

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

function randomWalk(price: number): number {
  const move = randomBetween(-MAX_MOVE, MAX_MOVE)
  return price * (1 + move)
}

function buildCandle(timestamp: number, open: number): CandlestickPoint {
  const close = randomWalk(open)
  const swing = Math.abs(close - open) * randomBetween(1.1, 2.5)
  const high = Math.max(open, close) + swing
  const low = Math.min(open, close) - swing
  const isSpike = Math.random() < 0.05
  const volume = isSpike ? randomBetween(300, 1500) : randomBetween(50, 500)

  return {
    timestamp,
    open: +open.toFixed(4),
    high: +high.toFixed(4),
    low: +low.toFixed(4),
    close: +close.toFixed(4),
    volume: +volume.toFixed(4),
  }
}

export function generateCandlestickSeed(symbol: CoinSymbol, count: number): CandlestickPoint[] {
  const now = Date.now()
  const startTime = now - count * 60_000

  const candles: CandlestickPoint[] = []
  let price = BASE_PRICES[symbol]

  for (let i = 0; i < count; i++) {
    const timestamp = startTime + i * 60_000
    const candle = buildCandle(timestamp, price)
    candles.push(candle)
    price = candle.close
  }

  return candles
}

export function generateNextCandle(prev: CandlestickPoint, symbol: CoinSymbol): CandlestickPoint {
  void symbol // price continuity comes from prev.close, symbol reserved for future use
  return buildCandle(prev.timestamp + 60_000, prev.close)
}

export function generateTicker(symbol: CoinSymbol, currentPrice: number): CoinTicker {
  const changePercent = randomBetween(-0.05, 0.05) // ±5%
  const priceChange = currentPrice * changePercent
  const openPrice = currentPrice - priceChange

  const highSwing = randomBetween(0.005, 0.03)
  const lowSwing = randomBetween(0.005, 0.03)
  const high24h = Math.max(currentPrice, openPrice) * (1 + highSwing)
  const low24h = Math.min(currentPrice, openPrice) * (1 - lowSwing)

  const volume24h = randomBetween(1000, 50_000)
  const quoteVolume = volume24h * currentPrice

  return {
    symbol,
    price: currentPrice,
    priceChange: +priceChange.toFixed(4),
    priceChangePercent: +(changePercent * 100).toFixed(2),
    high24h: +high24h.toFixed(4),
    low24h: +low24h.toFixed(4),
    volume24h: +volume24h.toFixed(4),
    quoteVolume: +quoteVolume.toFixed(2),
    lastUpdated: Date.now(),
  }
}

export function generateTradeEvent(symbol: CoinSymbol, price: number): TradeEvent {
  const side = Math.random() < 0.5 ? 'BUY' : 'SELL'
  const quantity = +randomBetween(0.01, 5.0).toFixed(4)
  const total = +(price * quantity).toFixed(2)

  let severity: TradeEvent['severity']
  if (total < 5_000) severity = 'low'
  else if (total < 50_000) severity = 'medium'
  else severity = 'high'

  return {
    id: crypto.randomUUID(),
    symbol,
    side,
    price,
    quantity,
    total,
    timestamp: Date.now(),
    severity,
  }
}

export function generateMarketSummary(tickers: CoinTicker[]): MarketSummary {
  // Approximate market caps using rough supply multiples per coin
  const SUPPLY_MULTIPLIERS: Record<CoinSymbol, number> = {
    BTCUSDT: 19_700_000,
    ETHUSDT: 120_000_000,
    SOLUSDT: 460_000_000,
    BNBUSDT: 145_000_000,
  }

  let totalMarketCap = 0
  let totalVolume24h = 0
  let btcPrice = 0
  let btcMarketCap = 0

  for (const ticker of tickers) {
    const cap = ticker.price * (SUPPLY_MULTIPLIERS[ticker.symbol] ?? 0)
    totalMarketCap += cap
    totalVolume24h += ticker.quoteVolume

    if (ticker.symbol === 'BTCUSDT') {
      btcPrice = ticker.price
      btcMarketCap = cap
    }
  }

  void btcPrice
  const btcDominance = totalMarketCap > 0 ? (btcMarketCap / totalMarketCap) * 100 : 0

  return {
    totalMarketCap: +totalMarketCap.toFixed(2),
    totalVolume24h: +totalVolume24h.toFixed(2),
    btcDominance: +btcDominance.toFixed(2),
    activePairs: tickers.length,
  }
}
