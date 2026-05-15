<script setup lang="ts">
interface Props {
  title: string
  value: string
  change?: string
  changePercent?: number
  subtitle?: string
  accent?: 'green' | 'red' | 'blue' | 'yellow'
  isLoading?: boolean
}

const props = defineProps<Props>()

const ACCENT_COLORS: Record<NonNullable<Props['accent']>, string> = {
  green:  'bg-accent-green',
  red:    'bg-accent-red',
  blue:   'bg-accent-blue',
  yellow: 'bg-accent-yellow',
}

function changeColor(pct: number | undefined): string {
  if (pct === undefined) return 'text-text-secondary'
  if (pct > 0) return 'text-accent-green'
  if (pct < 0) return 'text-accent-red'
  return 'text-text-secondary'
}
</script>

<template>
  <div class="metric-card relative overflow-hidden rounded-lg border border-border
              bg-bg-secondary p-4 transition-all duration-200
              hover:bg-bg-elevated hover:border-accent-blue/30">

    <!-- Accent bar on the left edge -->
    <div
      v-if="props.accent"
      class="absolute left-0 top-0 h-full w-[3px] rounded-l-lg"
      :class="ACCENT_COLORS[props.accent]"
    />

    <!-- Loading skeleton -->
    <template v-if="props.isLoading">
      <div class="shimmer h-3 w-24 rounded mb-3" />
      <div class="shimmer h-7 w-36 rounded mb-2" />
      <div class="shimmer h-3 w-20 rounded" />
    </template>

    <!-- Live content -->
    <template v-else>
      <!-- Title -->
      <p class="mb-1.5 text-[11px] font-medium uppercase tracking-widest text-text-secondary">
        {{ props.title }}
      </p>

      <!-- Value — slightly smaller font when the string is long -->
      <p
        class="font-mono font-semibold text-text-primary leading-none mb-1"
        :class="props.value.length > 10 ? 'text-2xl' : 'text-3xl'"
      >
        {{ props.value }}
      </p>

      <!-- Change row -->
      <div
        v-if="props.change !== undefined"
        class="flex items-center gap-1 mt-1.5"
      >
        <span class="text-xs font-medium" :class="changeColor(props.changePercent)">
          {{ (props.changePercent ?? 0) >= 0 ? '↑' : '↓' }}
          {{ props.change }}
        </span>
      </div>

      <!-- Subtitle -->
      <p v-if="props.subtitle" class="mt-1 text-[11px] text-text-muted">
        {{ props.subtitle }}
      </p>
    </template>

  </div>
</template>

<style scoped>
/* Shimmer keyframe — background-position slides across the element */
@keyframes shimmer {
  0%   { background-position: -400px 0; }
  100% { background-position:  400px 0; }
}

.shimmer {
  background: linear-gradient(
    90deg,
    var(--color-bg-elevated) 25%,
    var(--color-border)      50%,
    var(--color-bg-elevated) 75%
  );
  background-size: 800px 100%;
  animation: shimmer 1.4s ease-in-out infinite;
}
</style>
