<script setup lang="ts">
import { computed } from 'vue'
import useStreamStore from '../../stores/useStreamStore'
import { formatTimestamp } from '../../utils/formatters'

const store = useStreamStore()

// Dot color class driven by status
const dotClass = computed(() => {
  switch (store.status) {
    case 'connected':    return 'dot--green'
    case 'connecting':   return 'dot--yellow'
    case 'paused':       return 'dot--muted'
    case 'error':
    case 'disconnected': return 'dot--red'
  }
})

const truncated = computed(() =>
  store.lastError && store.lastError.message.length > 40
    ? store.lastError.message.slice(0, 40) + '…'
    : store.lastError?.message ?? ''
)
</script>

<template>
  <div class="relative inline-flex items-center gap-2 px-3 py-1.5
              rounded-full border border-border bg-bg-secondary
              text-xs font-medium select-none group">

    <!-- Animated status dot -->
    <span class="dot" :class="dotClass" />

    <!-- Status label -->
    <span :class="store.statusColor">{{ store.statusLabel }}</span>

    <!-- Retry counter -->
    <span v-if="store.retryCount > 0" class="text-text-muted">
      · Retry #{{ store.retryCount }}
    </span>

    <!-- Truncated error inline -->
    <span v-if="store.lastError" class="text-accent-red/70 max-w-[160px] truncate">
      · {{ truncated }}
    </span>

    <!-- Hover tooltip shown only in error state with a lastError -->
    <div
      v-if="store.status === 'error' && store.lastError"
      class="tooltip absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50
             w-64 p-3 rounded-lg border border-border bg-bg-elevated shadow-xl
             pointer-events-none opacity-0 group-hover:opacity-100
             transition-opacity duration-150"
    >
      <p class="text-accent-red font-semibold mb-1">Connection Error</p>
      <p class="text-text-secondary text-[11px] leading-snug break-words">
        {{ store.lastError.message }}
      </p>
      <p class="text-text-muted text-[10px] mt-2 font-mono">
        Code {{ store.lastError.code }} ·
        {{ formatTimestamp(store.lastError.timestamp, 'time') }}
      </p>
      <!-- Arrow -->
      <span class="absolute left-1/2 -translate-x-1/2 top-full
                   border-4 border-transparent border-t-border" />
    </div>

  </div>
</template>

<style scoped>
/* Base dot */
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* Connected — slow green glow pulse */
.dot--green {
  background: var(--color-accent-green);
  box-shadow: 0 0 0 0 color-mix(in srgb, var(--color-accent-green) 60%, transparent);
  animation: pulse-green 2s ease-in-out infinite;
}

@keyframes pulse-green {
  0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--color-accent-green) 60%, transparent); }
  50%       { box-shadow: 0 0 0 5px transparent; }
}

/* Connecting — fast yellow pulse */
.dot--yellow {
  background: var(--color-accent-yellow);
  animation: pulse-yellow 0.7s ease-in-out infinite;
}

@keyframes pulse-yellow {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.3; }
}

/* Error / disconnected — static red, no animation */
.dot--red {
  background: var(--color-accent-red);
}

/* Paused — muted, no animation */
.dot--muted {
  background: var(--color-text-muted);
}
</style>
