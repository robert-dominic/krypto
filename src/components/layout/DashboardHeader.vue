<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import useStreamStore from '../../stores/useStreamStore'
import useMarketStore from '../../stores/useMarketStore'
import { formatTimestamp } from '../../utils/formatters'
import type { CoinSymbol } from '../../types/market.types'

const streamStore = useStreamStore()
const marketStore = useMarketStore()

const clock = ref('')

function updateClock() {
  clock.value = formatTimestamp(Date.now(), 'time')
}

const COINS: { symbol: CoinSymbol; label: string }[] = [
  { symbol: 'BTCUSDT', label: 'BTC' },
  { symbol: 'ETHUSDT', label: 'ETH' },
  { symbol: 'SOLUSDT', label: 'SOL' },
  { symbol: 'BNBUSDT', label: 'BNB' },
]

let clockInterval: ReturnType<typeof setInterval>

onMounted(() => {
  updateClock()
  clockInterval = setInterval(updateClock, 1_000)
})

onUnmounted(() => clearInterval(clockInterval))
</script>

<template>
  <header class="fixed top-0 left-0 right-0 z-50 h-14 flex items-center px-4
                 bg-bg-secondary border-b border-border">

    <!-- Left: logo only -->
    <div class="flex items-center min-w-0 w-56">
      <span class="font-mono text-lg font-bold tracking-widest text-accent-blue select-none">
        KRYPTO
      </span>
    </div>

    <!-- Center: coin selector tabs -->
    <nav class="flex items-center gap-1 mx-auto">
      <button
        v-for="coin in COINS"
        :key="coin.symbol"
        class="px-4 py-1.5 text-sm font-medium rounded transition-colors duration-150
               border-b-2 focus:outline-none"
        :class="
          marketStore.activeCoin === coin.symbol
            ? 'border-accent-blue text-text-primary'
            : 'border-transparent text-text-secondary hover:text-text-primary'
        "
        @click="marketStore.setActiveCoin(coin.symbol)"
      >
        {{ coin.label }}
      </button>
    </nav>

    <!-- Right: clock, pause toggle, update counter -->
    <div class="flex items-center gap-4 w-56 justify-end">
      <!-- Live updates counter -->
      <span class="text-xs text-text-muted font-mono hidden sm:block">
        ↑ {{ streamStore.totalUpdates.toLocaleString() }} updates
      </span>

      <!-- Pause / Resume -->
      <button
        class="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded
               border border-accent-blue text-accent-blue
               hover:bg-accent-blue hover:text-bg-primary
               transition-colors duration-150 focus:outline-none"
        @click="streamStore.togglePause()"
      >
        <span>{{ streamStore.isPaused ? '▶' : '⏸' }}</span>
        <span>{{ streamStore.isPaused ? 'Resume' : 'Pause' }}</span>
      </button>

      <!-- Live clock -->
      <span class="text-sm font-mono text-text-secondary tabular-nums hidden md:block">
        {{ clock }}
      </span>
    </div>

  </header>
</template>
