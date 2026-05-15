<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch, ref } from 'vue'
import useMarketStore from '../stores/useMarketStore'
import useStreamStore from '../stores/useStreamStore'
import { useDataStream } from '../composables/useDataStream'
import CandlestickChart from '../components/charts/CandlestickChart.vue'
import LineChart from '../components/charts/LineChart.vue'
import BarChart from '../components/charts/BarChart.vue'
import AreaChart from '../components/charts/AreaChart.vue'
import MetricCard from '../components/widgets/MetricCard.vue'
import ActivityFeed from '../components/widgets/ActivityFeed.vue'
import StreamStatus from '../components/widgets/StreamStatus.vue'
import DashboardHeader from '../components/layout/DashboardHeader.vue'
import ErrorBoundary from '../components/layout/ErrorBoundary.vue'
import type { CoinSymbol, TimeRange } from '../types/market.types'
import {
  formatPrice,
  formatChange,
  formatVolume,
  formatMarketCap,
  getCoinShortLabel,
  isPositive,
} from '../utils/formatters'

const marketStore = useMarketStore()
const streamStore = useStreamStore()

const stream = useDataStream({
  onTrade: (event) => marketStore.addTradeEvent(event),
})

// Mirror stream state into streamStore so header / badge stay in sync
watch(stream.status, (s) => {
  streamStore.setStatus(s)
  if (s === 'error') streamStore.setError(stream.lastError.value)
})

watch(stream.retryCount, (n) => streamStore.setRetryCount(n))

// Watch each coin independently — fires only when that specific ticker changes,
// so updateTicker + incrementUpdates are called exactly once per tick received.
const SYMBOLS: CoinSymbol[] = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT']
for (const sym of SYMBOLS) {
  watch(
    () => stream.tickers.value[sym],
    (ticker) => {
      if (ticker) {
        marketStore.updateTicker(ticker)
        streamStore.incrementUpdates()
      }
    },
  )
}

onMounted(() => stream.connect())
onUnmounted(() => stream.disconnect())

// --- Chart type & time range tabs ---

const CHART_TYPES: { key: 'candlestick' | 'line' | 'area'; label: string }[] = [
  { key: 'candlestick', label: 'Candles' },
  { key: 'line',        label: 'Line'    },
  { key: 'area',        label: 'Area'    },
]

const TIME_RANGES: TimeRange[] = ['1m', '5m', '15m', '1h', 'live']

// --- Metric card computations ---

const isLoading = computed(() => marketStore.activeTicker === null)

const priceCard = computed(() => {
  const t = marketStore.activeTicker
  return {
    value:         t ? formatPrice(t.price, marketStore.activeCoin) : '—',
    change:        t ? formatChange(t.priceChangePercent) : undefined,
    changePercent: t?.priceChangePercent,
    accent:        t ? (isPositive(t.priceChangePercent) ? 'green' : 'red') as 'green' | 'red' : undefined,
  }
})

const highCard = computed(() => {
  const t = marketStore.activeTicker
  return {
    value:  t ? formatPrice(t.high24h, marketStore.activeCoin) : '—',
    accent: 'green' as const,
  }
})

const volumeCard = computed(() => {
  const t = marketStore.activeTicker
  return {
    value:  t ? formatVolume(t.volume24h) : '—',
    accent: 'blue' as const,
  }
})

// Rough market cap: price × approximate circulating supply
const SUPPLY: Record<CoinSymbol, number> = {
  BTCUSDT: 19_700_000,
  ETHUSDT: 120_000_000,
  SOLUSDT: 460_000_000,
  BNBUSDT: 145_000_000,
}

const marketCapCard = computed(() => {
  const t = marketStore.activeTicker
  const cap = t ? t.price * SUPPLY[marketStore.activeCoin] : 0
  return {
    value:  cap ? formatMarketCap(cap) : '—',
    accent: 'yellow' as const,
  }
})

// --- Bar chart: volume comparison across all 4 coins ---

const COIN_COLORS: Record<CoinSymbol, string> = {
  BTCUSDT: '#f7931a',
  ETHUSDT: '#627eea',
  SOLUSDT: '#9945ff',
  BNBUSDT: '#ffd700',
}

const volumeBarData = computed(() =>
  (['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT'] as CoinSymbol[]).map((sym) => ({
    label: getCoinShortLabel(sym),
    value: marketStore.tickers[sym]?.volume24h ?? 0,
    color: COIN_COLORS[sym],
  })),
)

// --- Area chart: portfolio history ---

const portfolioSeries = computed(() => [
  {
    name: 'Portfolio',
    data: marketStore.portfolioHistory,
    color: '#0080ff',
  },
])

// --- Line chart data: candles → time series (close price) ---

const lineData = computed(() =>
  marketStore.activeCandles.map((c) => ({
    timestamp: c.timestamp,
    value: c.close,
  })),
)

// --- Responsive chart heights ---

const windowWidth = ref(window.innerWidth)

function onResize() { windowWidth.value = window.innerWidth }

onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))

const mainChartHeight  = computed(() => windowWidth.value < 768 ? '260px' : '380px')
const smallChartHeight = computed(() => windowWidth.value < 768 ? '160px' : '200px')
</script>

<template>
  <div class="flex flex-col h-screen overflow-hidden bg-bg-primary">
    <DashboardHeader />

    <!-- Mobile: vertical scroll. xl: fixed-height side-by-side panels. -->
    <div class="flex-1 overflow-y-auto xl:overflow-hidden mt-14 p-3">
      <div class="flex flex-col xl:flex-row gap-3 xl:h-full">

      <!-- ═══════════════════════════════════════════════════
           LEFT COLUMN — charts (65% on xl, full on smaller)
           ═══════════════════════════════════════════════════ -->
      <div class="flex flex-col gap-3 xl:w-[65%] min-w-0 xl:overflow-hidden">

        <!-- Chart controls -->
        <div class="flex items-center justify-between flex-wrap gap-2 flex-shrink-0">

          <!-- Chart type tabs -->
          <div class="flex gap-1 bg-bg-secondary rounded-lg p-1 border border-border">
            <button
              v-for="ct in CHART_TYPES"
              :key="ct.key"
              class="px-3 py-1 text-xs font-medium rounded transition-colors duration-150"
              :class="
                marketStore.selectedChartType === ct.key
                  ? 'bg-accent-blue text-bg-primary'
                  : 'text-text-secondary hover:text-text-primary'
              "
              @click="marketStore.setChartType(ct.key)"
            >
              {{ ct.label }}
            </button>
          </div>

          <!-- Time range tabs -->
          <div class="flex gap-1 bg-bg-secondary rounded-lg p-1 border border-border">
            <button
              v-for="range in TIME_RANGES"
              :key="range"
              class="px-3 py-1 text-xs font-medium rounded transition-colors duration-150 uppercase"
              :class="
                marketStore.timeRange === range
                  ? 'bg-bg-elevated text-text-primary'
                  : 'text-text-secondary hover:text-text-primary'
              "
              @click="marketStore.setTimeRange(range)"
            >
              {{ range }}
            </button>
          </div>
        </div>

        <!-- Main chart panel wrapped in error boundary -->
        <ErrorBoundary>
        <div class="bg-bg-secondary border border-border rounded-lg flex-shrink-0">
          <!-- Coin + price label -->
          <div class="flex items-center gap-3 px-4 pt-3 pb-2 border-b border-border">
            <span class="text-sm font-semibold text-text-primary font-mono">
              {{ getCoinShortLabel(marketStore.activeCoin) }}/USDT
            </span>
            <span v-if="marketStore.activeTicker" class="text-xl font-bold font-mono text-text-primary">
              {{ formatPrice(marketStore.activeTicker.price, marketStore.activeCoin) }}
            </span>
            <span
              v-if="marketStore.activeTicker"
              class="text-sm font-mono"
              :class="isPositive(marketStore.activeTicker.priceChangePercent) ? 'text-accent-green' : 'text-accent-red'"
            >
              {{ formatChange(marketStore.activeTicker.priceChangePercent) }}
            </span>
          </div>

          <!-- Conditional chart render — v-if to fully remount on type change -->
          <CandlestickChart
            v-if="marketStore.selectedChartType === 'candlestick'"
            :data="marketStore.activeCandles"
            :symbol="marketStore.activeCoin"
            :height="mainChartHeight"
          />
          <LineChart
            v-else-if="marketStore.selectedChartType === 'line'"
            :data="lineData"
            :symbol="marketStore.activeCoin"
            :height="mainChartHeight"
          />
          <AreaChart
            v-else
            :series="[{ name: getCoinShortLabel(marketStore.activeCoin), data: lineData, color: '#0080ff' }]"
            :height="mainChartHeight"
          />
        </div>
        </ErrorBoundary>

        <!-- Bottom row: portfolio + volume — visible on all sizes -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-shrink-0">
          <!-- Portfolio area chart -->
          <div class="bg-bg-secondary border border-border rounded-lg">
            <div class="px-4 pt-3 pb-1 border-b border-border">
              <span class="text-xs font-medium uppercase tracking-widest text-text-secondary">
                Portfolio Value
              </span>
            </div>
            <AreaChart :series="portfolioSeries" :height="smallChartHeight" :show-legend="false" />
          </div>

          <!-- Volume bar chart -->
          <div class="bg-bg-secondary border border-border rounded-lg">
            <div class="px-4 pt-3 pb-1 border-b border-border">
              <span class="text-xs font-medium uppercase tracking-widest text-text-secondary">
                24h Volume
              </span>
            </div>
            <BarChart :data="volumeBarData" :height="smallChartHeight" />
          </div>
        </div>
      </div>

      <!-- ═══════════════════════════════════════════════════
           RIGHT COLUMN — metrics + feed (35% on xl)
           ═══════════════════════════════════════════════════ -->
      <div class="flex flex-col gap-3 xl:w-[35%] min-w-0 xl:flex-shrink-0 xl:overflow-hidden">

        <!-- Metric cards: 2×2 grid -->
        <div class="grid grid-cols-2 gap-3 flex-shrink-0">
          <MetricCard
            title="Price"
            :value="priceCard.value"
            :change="priceCard.change"
            :change-percent="priceCard.changePercent"
            :accent="priceCard.accent"
            :is-loading="isLoading"
          />
          <MetricCard
            title="24h High"
            :value="highCard.value"
            accent="green"
            :is-loading="isLoading"
          />
          <MetricCard
            title="24h Volume"
            :value="volumeCard.value"
            accent="blue"
            :is-loading="isLoading"
          />
          <MetricCard
            title="Market Cap"
            :value="marketCapCard.value"
            accent="yellow"
            :is-loading="isLoading"
          />
        </div>

        <!-- Activity feed: fixed height on mobile, fills remaining space on xl -->
        <div class="h-96 xl:flex-1 xl:h-auto bg-bg-secondary border border-border rounded-lg overflow-hidden min-h-0">
          <ActivityFeed />
        </div>
      </div>
      </div><!-- end inner xl:flex-row -->
    </div>

    <!-- Stream status badge — fixed bottom-left -->
    <div class="fixed bottom-4 left-4 z-50">
      <StreamStatus />
    </div>
  </div>
</template>
