import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  CoinSymbol,
  CoinTicker,
  CandlestickPoint,
  TimeSeriesPoint,
  TradeEvent,
  TimeRange,
} from '../types/market.types'
import { generateCandlestickSeed, generateNextCandle } from '../utils/dataGenerator'

const SYMBOLS: CoinSymbol[] = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT']
const MAX_CANDLES = 200
const MAX_TRADES = 100
const MAX_PORTFOLIO = 200

// Approximate USD weights for portfolio value calculation
const PORTFOLIO_WEIGHTS: Record<CoinSymbol, number> = {
  BTCUSDT: 0.5,
  ETHUSDT: 0.25,
  SOLUSDT: 0.15,
  BNBUSDT: 0.10,
}

const TIME_RANGE_COUNTS: Record<TimeRange, number> = {
  '1m': 1,
  '5m': 5,
  '15m': 15,
  '1h': 60,
  'live': 30,
}

export default defineStore('market', () => {
  // --- state ---

  const activeCoin = ref<CoinSymbol>('BTCUSDT')
  const timeRange = ref<TimeRange>('live')
  const selectedChartType = ref<'candlestick' | 'line' | 'area'>('candlestick')

  const tickers = ref<Record<CoinSymbol, CoinTicker | null>>({
    BTCUSDT: null,
    ETHUSDT: null,
    SOLUSDT: null,
    BNBUSDT: null,
  })

  const candlestickData = ref<Record<CoinSymbol, CandlestickPoint[]>>({
    BTCUSDT: [],
    ETHUSDT: [],
    SOLUSDT: [],
    BNBUSDT: [],
  })

  const portfolioHistory = ref<TimeSeriesPoint[]>([])
  const tradeEvents = ref<TradeEvent[]>([])

  // --- getters ---

  const activeTicker = computed(() => tickers.value[activeCoin.value])

  // Slice active coin's candles to the current time range window
  const activeCandles = computed(() => {
    const candles = candlestickData.value[activeCoin.value]
    const count = TIME_RANGE_COUNTS[timeRange.value]
    return candles.slice(-count)
  })

  // Alias kept for components that want an explicit name
  const filteredCandles = activeCandles

  const recentTrades = computed(() => tradeEvents.value.slice(0, 50))

  // --- actions ---

  function setActiveCoin(symbol: CoinSymbol) {
    activeCoin.value = symbol
  }

  function setTimeRange(range: TimeRange) {
    timeRange.value = range
  }

  function setChartType(type: 'candlestick' | 'line' | 'area') {
    selectedChartType.value = type
  }

  function updateTicker(ticker: CoinTicker) {
    tickers.value[ticker.symbol] = ticker

    // Advance the candle series by one tick
    const candles = candlestickData.value[ticker.symbol]
    const prev = candles[candles.length - 1]
    if (prev) {
      const next = generateNextCandle(prev, ticker.symbol)
      candles.push(next)
      if (candles.length > MAX_CANDLES) candles.splice(0, candles.length - MAX_CANDLES)
    }

    // Append a portfolio snapshot weighted across all live prices
    let portfolioValue = 0
    for (const sym of SYMBOLS) {
      const price = tickers.value[sym]?.price
      if (price !== undefined) {
        portfolioValue += price * PORTFOLIO_WEIGHTS[sym]
      }
    }

    if (portfolioValue > 0) {
      portfolioHistory.value.push({ timestamp: ticker.lastUpdated, value: portfolioValue })
      if (portfolioHistory.value.length > MAX_PORTFOLIO) {
        portfolioHistory.value.splice(0, portfolioHistory.value.length - MAX_PORTFOLIO)
      }
    }
  }

  function addTradeEvent(event: TradeEvent) {
    tradeEvents.value.unshift(event)
    if (tradeEvents.value.length > MAX_TRADES) {
      tradeEvents.value.length = MAX_TRADES
    }
  }

  function initializeSeedData() {
    const now = Date.now()

    for (const symbol of SYMBOLS) {
      candlestickData.value[symbol] = generateCandlestickSeed(symbol, 60)
    }

    // Seed portfolio history from the last 60 candle close prices
    // Use BTC as the proxy since all coins are seeded to the same timestamps
    const btcCandles = candlestickData.value['BTCUSDT']
    for (let i = 0; i < btcCandles.length; i++) {
      let value = 0
      for (const sym of SYMBOLS) {
        const candle = candlestickData.value[sym][i]
        if (candle) value += candle.close * PORTFOLIO_WEIGHTS[sym]
      }
      portfolioHistory.value.push({
        timestamp: now - (btcCandles.length - 1 - i) * 60_000,
        value,
      })
    }
  }

  // Seed immediately on store creation
  initializeSeedData()

  return {
    // state
    activeCoin,
    tickers,
    candlestickData,
    portfolioHistory,
    tradeEvents,
    timeRange,
    selectedChartType,
    // getters
    activeTicker,
    activeCandles,
    filteredCandles,
    recentTrades,
    // actions
    setActiveCoin,
    setTimeRange,
    setChartType,
    updateTicker,
    addTradeEvent,
    initializeSeedData,
  }
})
