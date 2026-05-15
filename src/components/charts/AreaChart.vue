<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { ComposeOption } from 'echarts/core'
import type { LineSeriesOption } from 'echarts/charts'
import type { GridComponentOption, TooltipComponentOption, LegendComponentOption } from 'echarts/components'
import type { TimeSeriesPoint } from '../../types/market.types'
import { formatTimestamp } from '../../utils/formatters'

use([LineChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer])

type ChartOption = ComposeOption<
  LineSeriesOption | GridComponentOption | TooltipComponentOption | LegendComponentOption
>

interface SeriesInput {
  name: string
  data: TimeSeriesPoint[]
  color: string
}

interface Props {
  series: SeriesInput[]
  height?: string
  showLegend?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  height: '300px',
  showLegend: true,
})

const isEmpty = computed(() => props.series.length === 0 || props.series.every((s) => s.data.length === 0))

// Hex color → rgba string helper (handles 6-char hex only)
function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

const option = computed<ChartOption>(() => ({
  animation: false,
  backgroundColor: 'transparent',
  grid: {
    left: 60,
    right: props.showLegend ? 16 : 16,
    top: props.showLegend ? 40 : 20,
    bottom: 40,
  },
  legend: props.showLegend
    ? {
        top: 4,
        right: 0,
        orient: 'horizontal',
        textStyle: { color: '#6b6b9a', fontSize: 11, fontFamily: 'Geist, sans-serif' },
        icon: 'roundRect',
        itemWidth: 12,
        itemHeight: 4,
      }
    : { show: false },
  xAxis: {
    type: 'time',
    axisLine: { show: false },
    axisTick: { show: false },
    splitLine: { show: false },
    axisLabel: {
      color: '#6b6b9a',
      fontSize: 11,
      fontFamily: 'Geist Mono, monospace',
      hideOverlap: true,
      formatter: (value: number) => formatTimestamp(value, 'time').slice(0, 5),
    },
  },
  yAxis: {
    type: 'value',
    axisLine: { show: false },
    axisTick: { show: false },
    splitLine: { lineStyle: { color: '#1e1e3a', type: 'dashed' } },
    axisLabel: {
      color: '#6b6b9a',
      fontSize: 11,
      fontFamily: 'Geist Mono, monospace',
      // Generic numeric format — caller decides what the values represent
      formatter: (v: number) =>
        v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M`
        : v >= 1_000    ? `${(v / 1_000).toFixed(1)}K`
        : v.toFixed(2),
    },
  },
  tooltip: {
    trigger: 'axis',
    backgroundColor: '#141428',
    borderColor: '#1e1e3a',
    borderWidth: 1,
    textStyle: { color: '#e8e8ff', fontSize: 11, fontFamily: 'Geist Mono, monospace' },
    axisPointer: {
      type: 'cross',
      crossStyle: { color: '#3d3d5c' },
      lineStyle: { color: '#3d3d5c', type: 'dashed' },
    },
    formatter: (params: unknown) => {
      const list = params as Array<{ seriesName: string; value: [number, number]; color: string }>
      if (!list[0]) return ''
      const ts = list[0].value[0]
      const rows = list
        .map(
          (p) => `
          <div style="display:flex;justify-content:space-between;gap:16px;margin-top:3px">
            <span style="display:flex;align-items:center;gap:5px">
              <span style="display:inline-block;width:8px;height:2px;background:${p.color};border-radius:1px"></span>
              <span style="color:#6b6b9a">${p.seriesName}</span>
            </span>
            <span style="color:#e8e8ff;font-weight:600">${p.value[1].toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
          </div>`,
        )
        .join('')
      return `
        <div style="min-width:160px;padding:2px 0">
          <div style="color:#3d3d5c;font-size:10px;margin-bottom:4px">${formatTimestamp(ts, 'time')}</div>
          ${rows}
        </div>
      `
    },
  },
  series: props.series.map((s) => ({
    name: s.name,
    type: 'line',
    smooth: true,
    symbol: 'none',
    lineStyle: { color: s.color, width: 2 },
    itemStyle: { color: s.color },
    areaStyle: {
      color: {
        type: 'linear',
        x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [
          { offset: 0, color: hexToRgba(s.color, 0.40) },
          { offset: 1, color: hexToRgba(s.color, 0.00) },
        ],
      },
    },
    data: s.data.map((p) => [p.timestamp, p.value]),
  })),
}))
</script>

<template>
  <div v-if="isEmpty" class="flex items-center justify-center" :style="{ height: props.height }">
    <div class="flex flex-col items-center gap-2">
      <span class="spinner" />
      <span class="text-xs text-text-muted">Waiting for data…</span>
    </div>
  </div>
  <VChart
    v-else
    :option="option"
    :style="{ height: props.height, width: '100%' }"
    autoresize
  />
</template>

<style scoped>
.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-accent-blue);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
