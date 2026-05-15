<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { ComposeOption } from 'echarts/core'
import type { LineSeriesOption } from 'echarts/charts'
import type { GridComponentOption, TooltipComponentOption } from 'echarts/components'
import type { TimeSeriesPoint, CoinSymbol } from '../../types/market.types'
import { formatPrice, formatTimestamp, getCoinShortLabel } from '../../utils/formatters'

use([LineChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer])

type ChartOption = ComposeOption<LineSeriesOption | GridComponentOption | TooltipComponentOption>

interface Props {
  data: TimeSeriesPoint[]
  symbol: CoinSymbol
  height?: string
  showArea?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  height: '300px',
  showArea: false,
})

const isEmpty = computed(() => props.data.length === 0)

const option = computed<ChartOption>(() => ({
  animation: false, // disabled for real-time performance
  backgroundColor: 'transparent',
  grid: {
    left: 60,
    right: 20,
    top: 20,
    bottom: 40,
  },
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
      formatter: (value: number) => formatTimestamp(value, 'time').slice(0, 5), // HH:MM
    },
  },
  yAxis: {
    type: 'value',
    position: 'left',
    axisLine: { show: false },
    axisTick: { show: false },
    splitLine: {
      lineStyle: { color: '#1e1e3a', type: 'dashed' },
    },
    axisLabel: {
      color: '#6b6b9a',
      fontSize: 11,
      fontFamily: 'Geist Mono, monospace',
      formatter: (value: number) => formatPrice(value, props.symbol),
    },
  },
  tooltip: {
    trigger: 'axis',
    backgroundColor: '#141428',
    borderColor: '#1e1e3a',
    borderWidth: 1,
    textStyle: { color: '#e8e8ff', fontSize: 12, fontFamily: 'Geist Mono, monospace' },
    formatter: (params: unknown) => {
      const list = params as Array<{ value: [number, number]; seriesName: string }>
      if (!list[0]) return ''
      const [ts, price] = list[0].value
      return `
        <div style="padding:2px 0">
          <span style="color:#6b6b9a;font-size:10px">${formatTimestamp(ts, 'time')}</span><br/>
          <span style="font-weight:600">${getCoinShortLabel(props.symbol)}</span>
          <span style="color:#0080ff;margin-left:8px">${formatPrice(price, props.symbol)}</span>
        </div>
      `
    },
    axisPointer: {
      lineStyle: { color: '#1e1e3a', type: 'dashed' },
    },
  },
  series: [
    {
      name: getCoinShortLabel(props.symbol),
      type: 'line',
      smooth: true,
      symbol: 'none', // hide data point dots for cleaner look
      lineStyle: { color: '#0080ff', width: 2 },
      itemStyle: { color: '#0080ff' },
      areaStyle: props.showArea
        ? {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(0,128,255,0.30)' },
                { offset: 1, color: 'rgba(0,128,255,0.00)' },
              ],
            },
          }
        : undefined,
      data: props.data.map((p) => [p.timestamp, p.value]),
    },
  ],
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
