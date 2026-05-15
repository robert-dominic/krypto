import { defineStore } from 'pinia'
import { ref, computed, onUnmounted } from 'vue'
import type { StreamStatus, ConnectionError } from '../types/market.types'

export default defineStore('stream', () => {
  // --- state ---

  const status = ref<StreamStatus>('disconnected')
  const retryCount = ref(0)
  const lastError = ref<ConnectionError | null>(null)
  const isPaused = ref(false)
  const lastConnectedAt = ref<number | null>(null)
  const totalUpdates = ref(0)

  // Ticks every second so uptimeSeconds stays reactive without Date.now() in computed
  const now = ref(Date.now())
  const ticker = setInterval(() => { now.value = Date.now() }, 1_000)
  onUnmounted(() => clearInterval(ticker))

  // --- getters ---

  const isConnected = computed(() => status.value === 'connected')
  const isLive = computed(() => isConnected.value && !isPaused.value)

  const statusLabel = computed<string>(() => {
    const labels: Record<StreamStatus, string> = {
      connecting: 'Connecting...',
      connected: 'Live',
      disconnected: 'Disconnected',
      error: 'Connection Error',
      paused: 'Paused',
    }
    return labels[status.value]
  })

  const statusColor = computed<string>(() => {
    switch (status.value) {
      case 'connected': return 'text-accent-green'
      case 'connecting': return 'text-accent-yellow'
      case 'paused': return 'text-text-secondary'
      case 'error':
      case 'disconnected': return 'text-accent-red'
    }
  })

  // Seconds elapsed since the stream last connected; 0 if never connected
  const uptimeSeconds = computed<number>(() => {
    if (!lastConnectedAt.value) return 0
    return Math.floor((now.value - lastConnectedAt.value) / 1_000)
  })

  // --- actions ---

  function setStatus(s: StreamStatus) {
    status.value = s
    if (s === 'connected') lastConnectedAt.value = Date.now()
  }

  function setRetryCount(count: number) {
    retryCount.value = count
  }

  function setError(error: ConnectionError | null) {
    lastError.value = error
  }

  function togglePause() {
    isPaused.value = !isPaused.value
  }

  function incrementUpdates() {
    totalUpdates.value++
  }

  return {
    // state
    status,
    retryCount,
    lastError,
    isPaused,
    lastConnectedAt,
    totalUpdates,
    // getters
    isConnected,
    isLive,
    statusLabel,
    statusColor,
    uptimeSeconds,
    // actions
    setStatus,
    setRetryCount,
    setError,
    togglePause,
    incrementUpdates,
  }
})
