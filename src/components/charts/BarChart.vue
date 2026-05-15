<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, TitleComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { ComposeOption } from 'echarts/core'
import type { BarSeriesOption } from 'echarts/charts'
import type { GridComponentOption, TooltipComponentOption, TitleComponentOption } from 'echarts/components'
import { formatVolume } from '../../utils/formatters'

use([BarChart, GridComponent, TooltipComponent, TitleComponent, CanvasRenderer])

type ChartOption = ComposeOption<BarSeriesOption | GridComponentOption | TooltipComponentOption | TitleComponentOption>

interface BarItem {
  label: string
  value: number
  color?: string
}

interface Props {
  data: BarItem[]
  title?: string
  height?: string
  horizontal?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  height: '250px',
  horizontal: false,
})

const isEmpty = computed(() => props.data.length === 0 || props.data.every((d) => d.value === 0))

const AXIS_LABEL_STYLE = {
  color: '#6b6b9a',
  fontSize: 11,
  fontFamily: 'Geist Mono, monospace',
}

const option = computed<ChartOption>(() => {
  const labels = props.data.map((d) => d.label)

  const seriesData = props.data.map((d) => ({
    value: d.value,
    itemStyle: {
      color: d.color ?? '#0080ff',
      // Rounded corners: top for vertical bars, right end for horizontal
      borderRadius: props.horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0],
    },
  }))

  const categoryAxis = {
    type: 'category' as const,
    data: labels,
    axisLine: { show: false },
    axisTick: { show: false },
    splitLine: { show: false },
    axisLabel: AXIS_LABEL_STYLE,
  }

  const valueAxis = {
    type: 'value' as const,
    axisLine: { show: false },
    axisTick: { show: false },
    splitLine: { lineStyle: { color: '#1e1e3a', type: 'dashed' as const } },
    axisLabel: {
      ...AXIS_LABEL_STYLE,
      formatter: (v: number) => formatVolume(v),
    },
  }

  return {
    // Short animation — this chart updates periodically, not every second
    animation: true,
    animationDuration: 300,
    animationEasing: 'cubicOut',
    backgroundColor: 'transparent',
    grid: { left: 55, right: 16, top: props.title ? 36 : 16, bottom: 36 },
    title: props.title
      ? {
          text: props.title,
          textStyle: { color: '#6b6b9a', fontSize: 11, fontWeight: 'normal', fontFamily: 'Geist, sans-serif' },
          top: 4,
          left: 0,
        }
      : undefined,

    // Axes swap when horizontal
    xAxis: props.horizontal ? valueAxis : categoryAxis,
    yAxis: props.horizontal ? categoryAxis : valueAxis,

    tooltip: {
      trigger: 'axis',
      backgroundColor: '#141428',
      borderColor: '#1e1e3a',
      borderWidth: 1,
      textStyle: { color: '#e8e8ff', fontSize: 11, fontFamily: 'Geist Mono, monospace' },
      axisPointer: { lineStyle: { color: '#3d3d5c', type: 'dashed' } },
      formatter: (params: unknown) => {
        const list = params as Array<{ name: string; value: number; color: string }>
        if (!list[0]) return ''
        const { name, value, color } = list[0]
        return `
          <div style="display:flex;align-items:center;gap:8px">
            <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${color}"></span>
            <span style="color:#6b6b9a">${name}</span>
            <span style="color:#e8e8ff;font-weight:600;margin-left:auto">${formatVolume(value)}</span>
          </div>
        `
      },
    },

    series: [
      {
        type: 'bar',
        data: seriesData,
        barMaxWidth: 48,
        showBackground: true,
        backgroundStyle: { color: 'rgba(20,20,40,0.3)', borderRadius: props.horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0] },
        label: {
          show: true,
          position: props.horizontal ? 'right' : 'top',
          color: '#6b6b9a',
          fontSize: 10,
          fontFamily: 'Geist Mono, monospace',
          // ECharts passes CallbackDataParams; value is the bar's numeric value
          formatter: (p: unknown) => formatVolume((p as { value: number }).value),
        },
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
