<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import useMarketStore from '../../stores/useMarketStore'
import {
  formatPrice,
  formatTimestamp,
  formatQuantity,
  getCoinShortLabel,
} from '../../utils/formatters'
import type { TradeEvent, CoinSymbol } from '../../types/market.types'

const marketStore = useMarketStore()

type SideFilter = 'ALL' | 'BUY' | 'SELL'

const sideFilter = ref<SideFilter>('ALL')
const searchQuery = ref('')

// Container ref used for scroll-position preservation
const listEl = ref<HTMLElement | null>(null)

const filtered = computed<TradeEvent[]>(() => {
  const q = searchQuery.value.trim().toLowerCase()
  return marketStore.recentTrades.filter((t) => {
    if (sideFilter.value !== 'ALL' && t.side !== sideFilter.value) return false
    if (q) {
      const label = getCoinShortLabel(t.symbol as CoinSymbol).toLowerCase()
      return label.includes(q) || t.side.toLowerCase().includes(q)
    }
    return true
  })
})

// Preserve scroll position when new rows are prepended at the top
watch(
  () => marketStore.recentTrades.length,
  async (newLen, oldLen) => {
    if (!listEl.value || newLen <= oldLen) return
    const el = listEl.value
    const prevScrollTop = el.scrollTop
    const prevHeight = el.scrollHeight
    await nextTick()
    // Offset by however many pixels the new rows added
    el.scrollTop = prevScrollTop + (el.scrollHeight - prevHeight)
  },
)

const SEVERITY_DOT: Record<TradeEvent['severity'], string> = {
  low:    'bg-text-secondary',
  medium: 'bg-accent-yellow',
  high:   'bg-accent-red shadow-[0_0_6px_var(--color-accent-red)]',
}

const SIDE_FILTER_OPTS: SideFilter[] = ['ALL', 'BUY', 'SELL']
</script>

<template>
  <div class="flex flex-col h-full overflow-hidden">

    <!-- Header -->
    <div class="flex items-center justify-between px-3 pt-3 pb-2 flex-shrink-0">
      <div class="flex items-center gap-2">
        <span class="text-xs font-semibold uppercase tracking-widest text-text-secondary">
          Live Trades
        </span>
        <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-bg-elevated text-text-muted">
          {{ filtered.length }}
        </span>
      </div>

      <!-- Side filter pills -->
      <div class="flex gap-1">
        <button
          v-for="opt in SIDE_FILTER_OPTS"
          :key="opt"
          class="px-2 py-0.5 text-[10px] font-medium rounded-full transition-colors duration-150"
          :class="
            sideFilter === opt
              ? 'bg-accent-blue text-bg-primary'
              : 'bg-bg-elevated text-text-secondary hover:text-text-primary'
          "
          @click="sideFilter = opt"
        >
          {{ opt }}
        </button>
      </div>
    </div>

    <!-- Search -->
    <div class="px-3 pb-2 flex-shrink-0">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Filter by coin or side…"
        class="w-full text-xs bg-bg-elevated border border-border rounded px-2.5 py-1.5
               text-text-primary placeholder-text-muted focus:outline-none
               focus:border-accent-blue/50 transition-colors duration-150"
      />
    </div>

    <!-- Trade list -->
    <div ref="listEl" class="flex-1 overflow-y-auto no-scrollbar px-3 pb-3">
      <TransitionGroup name="trade" tag="ul" class="space-y-1">
        <li
          v-for="trade in filtered"
          :key="trade.id"
          v-memo="[trade.id]"
          class="trade-row flex items-center gap-2 rounded px-2 py-1.5
                 bg-bg-elevated border border-transparent
                 hover:border-border transition-colors duration-100"
        >
          <!-- Severity dot + coin label -->
          <div class="flex items-center gap-1.5 w-14 flex-shrink-0">
            <span
              class="w-1.5 h-1.5 rounded-full flex-shrink-0"
              :class="SEVERITY_DOT[trade.severity]"
            />
            <span class="text-[11px] font-mono text-text-secondary">
              {{ getCoinShortLabel(trade.symbol as CoinSymbol) }}
            </span>
          </div>

          <!-- Side badge + price + quantity -->
          <div class="flex items-center gap-1.5 flex-1 min-w-0">
            <span
              class="text-[10px] font-bold px-1.5 py-0.5 rounded leading-none flex-shrink-0"
              :class="
                trade.side === 'BUY'
                  ? 'bg-accent-green/15 text-accent-green'
                  : 'bg-accent-red/15 text-accent-red'
              "
            >
              {{ trade.side }}
            </span>
            <span class="text-xs font-mono text-text-primary truncate">
              {{ formatPrice(trade.price, trade.symbol as CoinSymbol) }}
            </span>
            <span class="text-[10px] text-text-muted flex-shrink-0">
              × {{ formatQuantity(trade.quantity) }}
            </span>
          </div>

          <!-- Total + timestamp -->
          <div class="flex flex-col items-end flex-shrink-0 min-w-[72px]">
            <span class="text-[11px] font-mono text-text-primary">
              ${{ trade.total.toLocaleString('en-US', { maximumFractionDigits: 0 }) }}
            </span>
            <span class="text-[10px] text-text-muted">
              {{ formatTimestamp(trade.timestamp, 'relative') }}
            </span>
          </div>
        </li>
      </TransitionGroup>

      <!-- Empty state -->
      <p v-if="filtered.length === 0" class="text-center text-text-muted text-xs py-8">
        No trades match the filter.
      </p>
    </div>

  </div>
</template>

<style scoped>
/* Slide-down + fade-in for incoming trade rows */
.trade-enter-active {
  transition: opacity 200ms ease, transform 200ms ease;
}

.trade-enter-from {
  opacity: 0;
  transform: translateY(-6px);
}

/* Items already in the list don't animate on their own move */
.trade-move {
  transition: none;
}
</style>
