import { ref, computed, onUnmounted, readonly } from 'vue'
import type {
  CoinSymbol,
  CoinTicker,
  TradeEvent,
  StreamStatus,
  ConnectionError,
  BinanceTickerMessage,
  CandlestickPoint,
} from '../types/market.types'
import {
  generateTicker,
  generateTradeEvent,
  generateNextCandle,
  generateCandlestickSeed,
} from '../utils/dataGenerator'

const SYMBOLS: CoinSymbol[] = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT']

const WS_URL =
  'wss://stream.binance.com:9443/stream?streams=' +
  'btcusdt@ticker/ethusdt@ticker/solusdt@ticker/bnbusdt@ticker'

const MAX_RETRIES = 5
const MAX_BUFFER = 50

interface StreamOptions {
  onTrade?: (event: TradeEvent) => void
}

type TickerUpdate = { symbol: CoinSymbol; ticker: CoinTicker }

export function useDataStream(options: StreamOptions = {}) {
  // --- reactive state ---
  const _status = ref<StreamStatus>('disconnected')
  const _tickers = ref<Record<CoinSymbol, CoinTicker | null>>({
    BTCUSDT: null,
    ETHUSDT: null,
    SOLUSDT: null,
    BNBUSDT: null,
  })
  const _lastError = ref<ConnectionError | null>(null)
  const _retryCount = ref(0)

  // --- internal mutable state (not reactive by design) ---
  let ws: WebSocket | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let mockInterval: ReturnType<typeof setInterval> | null = null
  let paused = false

  // Latest candle per symbol — drives price continuity in mock mode
  const mockCandles: Partial<Record<CoinSymbol, CandlestickPoint>> = {}

  // Holds updates that arrived while paused; flushed on resume
  const pendingBuffer: TickerUpdate[] = []

  // --- computed ---
  const isStreaming = computed(() => _status.value === 'connected')

  // --- helpers ---

  function getBackoffDelay(attempt: number): number {
    // 1s, 2s, 4s, 8s … capped at 30s
    return Math.min(1_000 * Math.pow(2, attempt - 1), 30_000)
  }

  // Single point where ticker state is written — respects pause
  function applyUpdate({ symbol, ticker }: TickerUpdate) {
    if (paused) {
      if (pendingBuffer.length >= MAX_BUFFER) pendingBuffer.shift()
      pendingBuffer.push({ symbol, ticker })
      return
    }
    _tickers.value[symbol] = ticker
  }

  function maybeTrade(symbol: CoinSymbol, price: number) {
    if (Math.random() < 0.3 && options.onTrade) {
      options.onTrade(generateTradeEvent(symbol, price))
    }
  }

  // Parse and validate a raw Binance 24hr ticker payload
  function parseTicker(raw: BinanceTickerMessage): CoinTicker | null {
    const required: (keyof BinanceTickerMessage)[] = ['e', 's', 'c', 'p', 'P', 'h', 'l', 'v', 'q']
    for (const field of required) {
      if (!(field in raw)) return null
    }

    const symbol = raw.s as CoinSymbol
    if (!SYMBOLS.includes(symbol)) return null

    const price = parseFloat(raw.c)
    if (isNaN(price)) return null // price is the critical field; skip entire message if invalid

    const prev = _tickers.value[symbol]

    // Fallback to previous value when a non-critical field fails to parse
    const safe = (val: string, fallback: number) => {
      const n = parseFloat(val)
      return isNaN(n) ? fallback : n
    }

    return {
      symbol,
      price,
      priceChange: safe(raw.p, prev?.priceChange ?? 0),
      priceChangePercent: safe(raw.P, prev?.priceChangePercent ?? 0),
      high24h: safe(raw.h, prev?.high24h ?? price),
      low24h: safe(raw.l, prev?.low24h ?? price),
      volume24h: safe(raw.v, prev?.volume24h ?? 0),
      quoteVolume: safe(raw.q, prev?.quoteVolume ?? 0),
      lastUpdated: raw.E,
    }
  }

  // --- WebSocket ---

  function connectWS() {
    if (ws && ws.readyState !== WebSocket.CLOSED) ws.close()

    _status.value = 'connecting'
    ws = new WebSocket(WS_URL)

    ws.onopen = () => {
      _status.value = 'connected'
      _retryCount.value = 0
      _lastError.value = null
    }

    ws.onmessage = (event: MessageEvent<string>) => {
      let parsed: { data: BinanceTickerMessage }
      try {
        parsed = JSON.parse(event.data)
      } catch {
        return // silently drop malformed frames
      }

      const raw = parsed?.data
      if (!raw || typeof raw !== 'object') return

      const ticker = parseTicker(raw)
      if (!ticker) return

      applyUpdate({ symbol: ticker.symbol, ticker })
      maybeTrade(ticker.symbol, ticker.price)
    }

    ws.onclose = () => {
      // Intentional disconnect sets status first; skip auto-reconnect in that case
      if (_status.value === 'disconnected') return
      scheduleReconnect()
    }

    ws.onerror = () => {
      _lastError.value = {
        code: 1006,
        message: 'WebSocket connection failed',
        timestamp: Date.now(),
        retryCount: _retryCount.value,
      }
      _status.value = 'error'
      // onerror is always followed by onclose — reconnect handled there
    }
  }

  function scheduleReconnect() {
    _retryCount.value++

    if (_retryCount.value > MAX_RETRIES) {
      startMockFallback()
      return
    }

    _status.value = 'connecting'
    reconnectTimer = setTimeout(connectWS, getBackoffDelay(_retryCount.value))
  }

  // --- Mock fallback (used after MAX_RETRIES exhausted) ---

  function startMockFallback() {
    // Seed each symbol with a short history so prices start at realistic values
    for (const symbol of SYMBOLS) {
      const seed = generateCandlestickSeed(symbol, 10)
      mockCandles[symbol] = seed[seed.length - 1]
    }

    _status.value = 'connected'

    mockInterval = setInterval(() => {
      for (const symbol of SYMBOLS) {
        const prev = mockCandles[symbol]!
        const next = generateNextCandle(prev, symbol)
        mockCandles[symbol] = next

        const ticker = generateTicker(symbol, next.close)
        applyUpdate({ symbol, ticker })
        maybeTrade(symbol, ticker.price)
      }
    }, 1_000)
  }

  // --- Teardown ---

  function clearTimers() {
    if (mockInterval) { clearInterval(mockInterval); mockInterval = null }
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }
  }

  // --- Public API ---

  function connect() {
    clearTimers()
    paused = false
    pendingBuffer.length = 0
    _retryCount.value = 0
    connectWS()
  }

  function disconnect() {
    clearTimers()
    _status.value = 'disconnected'
    if (ws && ws.readyState !== WebSocket.CLOSED) ws.close()
    ws = null
  }

  function pause() {
    paused = true
    _status.value = 'paused'
  }

  function resume() {
    paused = false
    _status.value = 'connected'

    // Flush buffered updates in arrival order
    for (const update of pendingBuffer) {
      _tickers.value[update.symbol] = update.ticker
    }
    pendingBuffer.length = 0
  }

  onUnmounted(disconnect)

  return {
    status: readonly(_status),
    tickers: readonly(_tickers),
    lastError: readonly(_lastError),
    retryCount: readonly(_retryCount),
    isStreaming,
    connect,
    disconnect,
    pause,
    resume,
  }
}
