<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CandlestickChart, BarChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  DataZoomComponent,
  LegendComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { ComposeOption } from 'echarts/core'
import type { CandlestickSeriesOption, BarSeriesOption } from 'echarts/charts'
import type {
  GridComponentOption,
  TooltipComponentOption,
  DataZoomComponentOption,
} from 'echarts/components'
import type { CandlestickPoint, CoinSymbol } from '../../types/market.types'
import { formatPrice, formatVolume, formatTimestamp, getCoinShortLabel } from '../../utils/formatters'

use([CandlestickChart, BarChart, GridComponent, TooltipComponent, DataZoomComponent, LegendComponent, CanvasRenderer])

type ChartOption = ComposeOption<
  | CandlestickSeriesOption
  | BarSeriesOption
  | GridComponentOption
  | TooltipComponentOption
  | DataZoomComponentOption
>

interface Props {
  data: CandlestickPoint[]
  symbol: CoinSymbol
  height?: string
}

const props = withDefaults(defineProps<Props>(), {
  height: '400px',
})

const isEmpty = computed(() => props.data.length === 0)

const AXIS_LABEL_STYLE = {
  color: '#6b6b9a',
  fontSize: 11,
  fontFamily: 'Geist Mono, monospace',
}

const option = computed<ChartOption>(() => {
  // Pre-process data once per compute to avoid repeated mapping in series
  const xLabels = props.data.map((p) => formatTimestamp(p.timestamp, 'time').slice(0, 5))

  // ECharts candlestick format: [open, close, low, high]
  const candleData = props.data.map((p) => [p.open, p.close, p.low, p.high])

  // Volume bars — colored per candle direction
  const volumeData = props.data.map((p) => ({
    value: p.volume,
    itemStyle: {
      color: p.close >= p.open
        ? 'rgba(0,255,136,0.55)'
        : 'rgba(255,51,102,0.55)',
    },
  }))

  return {
    animation: false,
    backgroundColor: 'transparent',

    // Two grids stacked: candles on top, volume on bottom
    grid: [
      { left: 60, right: 20, top: 20, bottom: '32%' },
      { left: 60, right: 20, top: '72%', bottom: 52 },
    ],

    xAxis: [
      {
        type: 'category',
        gridIndex: 0,
        data: xLabels,
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false }, // labels shown only on the bottom axis
        axisPointer: { label: { show: false } },
      },
      {
        type: 'category',
        gridIndex: 1,
        data: xLabels,
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { ...AXIS_LABEL_STYLE, fontSize: 10 },
      },
    ],

    yAxis: [
      {
        scale: true,
        gridIndex: 0,
        position: 'left',
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: '#1e1e3a', type: 'dashed' } },
        axisLabel: {
          ...AXIS_LABEL_STYLE,
          formatter: (v: number) => formatPrice(v, props.symbol),
        },
      },
      {
        scale: true,
        gridIndex: 1,
        position: 'left',
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: {
          ...AXIS_LABEL_STYLE,
          fontSize: 10,
          formatter: (v: number) => formatVolume(v),
        },
      },
    ],

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
        const list = params as Array<{ seriesType: string; value: number[]; dataIndex: number }>
        const candle = list.find((p) => p.seriesType === 'candlestick')
        const bar = list.find((p) => p.seriesType === 'bar')
        if (!candle) return ''

        // value is [open, close, low, high] — guard each with ?? 0
        const open  = candle.value[0] ?? 0
        const close = candle.value[1] ?? 0
        const low   = candle.value[2] ?? 0
        const high  = candle.value[3] ?? 0
        const vol   = bar ? (bar.value[1] ?? bar.value[0] ?? 0) : null

        const coin = getCoinShortLabel(props.symbol)
        const isUp = close >= open
        const dirColor = isUp ? '#00ff88' : '#ff3366'
        const row = (k: string, v: string) =>
          `<div style="display:flex;justify-content:space-between;gap:16px">
             <span style="color:#6b6b9a">${k}</span>
             <span style="color:${dirColor}">${v}</span>
           </div>`

        return `
          <div style="min-width:180px;padding:4px 0">
            <div style="font-weight:600;margin-bottom:6px;color:#e8e8ff">${coin}</div>
            ${row('Open',  formatPrice(open,  props.symbol))}
            ${row('High',  formatPrice(high,  props.symbol))}
            ${row('Low',   formatPrice(low,   props.symbol))}
            ${row('Close', formatPrice(close, props.symbol))}
            ${vol !== null ? row('Vol', formatVolume(vol)) : ''}
          </div>
        `
      },
    },

    dataZoom: [
      {
        // Scroll-to-zoom on both chart grids
        type: 'inside',
        xAxisIndex: [0, 1],
        start: 60,
        end: 100,
      },
      {
        // Drag handle slider below the volume grid
        type: 'slider',
        xAxisIndex: [0, 1],
        start: 60,
        end: 100,
        height: 20,
        backgroundColor: '#0f0f1a',
        borderColor: '#1e1e3a',
        fillerColor: 'rgba(0,128,255,0.12)',
        handleStyle: { color: '#0080ff', borderColor: '#0080ff' },
        moveHandleStyle: { color: '#0080ff' },
        textStyle: { color: '#6b6b9a', fontSize: 10 },
        labelFormatter: (_: number, val: string) => val,
      },
    ],

    series: [
      {
        name: getCoinShortLabel(props.symbol),
        type: 'candlestick',
        xAxisIndex: 0,
        yAxisIndex: 0,
        data: candleData,
        itemStyle: {
          color: '#00ff88',        // bullish body fill
          color0: '#ff3366',       // bearish body fill
          borderColor: '#00ff88', // bullish wick
          borderColor0: '#ff3366', // bearish wick
        },
      },
      {
        name: 'Volume',
        type: 'bar',
        xAxisIndex: 1,
        yAxisIndex: 1,
        data: volumeData,
        barMaxWidth: 8,
      },
    ],
  }
})
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
