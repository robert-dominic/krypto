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

const COINS: { symbol: CoinSymbol; label: string; sublabel: string }[] = [
  { symbol: 'BTCUSDT', label: 'BTC',  sublabel: 'Bitcoin'  },
  { symbol: 'ETHUSDT', label: 'ETH',  sublabel: 'Ethereum' },
  { symbol: 'SOLUSDT', label: 'SOL',  sublabel: 'Solana'   },
  { symbol: 'BNBUSDT', label: 'BNB',  sublabel: 'BNB'      },
]

const activeCoin = () => COINS.find((c) => c.symbol === marketStore.activeCoin)!

const dropdownOpen = ref(false)

function selectCoin(symbol: CoinSymbol) {
  marketStore.setActiveCoin(symbol)
  dropdownOpen.value = false
}

function onClickOutside(e: MouseEvent) {
  const el = document.getElementById('coin-dropdown')
  if (el && !el.contains(e.target as Node)) dropdownOpen.value = false
}

let clockInterval: ReturnType<typeof setInterval>

onMounted(() => {
  updateClock()
  clockInterval = setInterval(updateClock, 1_000)
  document.addEventListener('click', onClickOutside)
})

onUnmounted(() => {
  clearInterval(clockInterval)
  document.removeEventListener('click', onClickOutside)
})
</script>

<template>
  <header class="fixed top-0 left-0 right-0 z-50 h-14 flex items-center px-4 gap-3
                 bg-bg-secondary border-b border-border">

    <!-- Left: logo -->
    <div class="flex items-center flex-shrink-0">
      <span class="font-mono text-lg font-bold tracking-widest text-accent-blue select-none">
        KRYPTO
      </span>
    </div>

    <!-- Center: coin dropdown -->
    <div id="coin-dropdown" class="relative flex-1 flex justify-center">
      <button
        class="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg
               bg-bg-elevated border border-border text-text-primary
               hover:border-accent-blue transition-colors duration-150 focus:outline-none"
        @click.stop="dropdownOpen = !dropdownOpen"
      >
        <span class="font-mono font-semibold">{{ activeCoin().label }}/USDT</span>
        <svg
          class="w-3.5 h-3.5 text-text-secondary transition-transform duration-150"
          :class="dropdownOpen ? 'rotate-180' : ''"
          viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"
        >
          <path d="M4 6l4 4 4-4" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>

      <!-- Dropdown menu -->
      <Transition
        enter-active-class="transition-all duration-150 ease-out"
        enter-from-class="opacity-0 scale-95 -translate-y-1"
        enter-to-class="opacity-100 scale-100 translate-y-0"
        leave-active-class="transition-all duration-100 ease-in"
        leave-from-class="opacity-100 scale-100 translate-y-0"
        leave-to-class="opacity-0 scale-95 -translate-y-1"
      >
        <div
          v-if="dropdownOpen"
          class="absolute top-full mt-2 w-44 rounded-lg border border-border
                 bg-bg-secondary shadow-xl shadow-black/40 overflow-hidden z-50"
        >
          <button
            v-for="coin in COINS"
            :key="coin.symbol"
            class="w-full flex items-center justify-between px-4 py-2.5 text-sm
                   transition-colors duration-100 focus:outline-none"
            :class="
              marketStore.activeCoin === coin.symbol
                ? 'bg-bg-elevated text-text-primary'
                : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
            "
            @click="selectCoin(coin.symbol)"
          >
            <span class="font-mono font-medium">{{ coin.label }}/USDT</span>
            <span
              v-if="marketStore.activeCoin === coin.symbol"
              class="w-1.5 h-1.5 rounded-full bg-accent-blue flex-shrink-0"
            />
          </button>
        </div>
      </Transition>
    </div>

    <!-- Right: updates, pause icon, clock -->
    <div class="flex items-center gap-3 flex-shrink-0">
      <span class="text-xs text-text-muted font-mono hidden sm:block">
        ↑ {{ streamStore.totalUpdates.toLocaleString() }}
      </span>

      <!-- Pause / Resume — icon only -->
      <button
        class="w-8 h-8 flex items-center justify-center rounded border border-accent-blue
               text-accent-blue hover:bg-accent-blue hover:text-bg-primary
               transition-colors duration-150 focus:outline-none"
        :title="streamStore.isPaused ? 'Resume' : 'Pause'"
        @click="streamStore.togglePause()"
      >
        <span class="text-sm leading-none">{{ streamStore.isPaused ? '▶' : '⏸' }}</span>
      </button>

      <span class="text-sm font-mono text-text-secondary tabular-nums hidden md:block">
        {{ clock }}
      </span>
    </div>

  </header>
</template>
