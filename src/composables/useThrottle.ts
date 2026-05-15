import { ref, watch, onUnmounted, type Ref } from 'vue'

// Emits the latest value at most once per `delay` ms
export function useThrottle<T>(value: Ref<T>, delay: number): Ref<T> {
  const throttled = ref<T>(value.value) as Ref<T>
  let lastRun = 0
  let pending: ReturnType<typeof setTimeout> | null = null

  const stop = watch(value, (newVal) => {
    const now = Date.now()
    const remaining = delay - (now - lastRun)

    if (remaining <= 0) {
      if (pending) clearTimeout(pending)
      throttled.value = newVal
      lastRun = now
    } else if (!pending) {
      // schedule the trailing edge update
      pending = setTimeout(() => {
        throttled.value = value.value
        lastRun = Date.now()
        pending = null
      }, remaining)
    }
  })

  onUnmounted(() => {
    stop()
    if (pending) clearTimeout(pending)
  })

  return throttled
}

// Waits until `delay` ms of silence before emitting
export function useDebounce<T>(value: Ref<T>, delay: number): Ref<T> {
  const debounced = ref<T>(value.value) as Ref<T>
  let timer: ReturnType<typeof setTimeout> | null = null

  const stop = watch(value, (newVal) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      debounced.value = newVal
      timer = null
    }, delay)
  })

  onUnmounted(() => {
    stop()
    if (timer) clearTimeout(timer)
  })

  return debounced
}

// Deduplicates rapid calls — fn runs at most once per animation frame
export function useRafThrottle(fn: () => void): () => void {
  let rafId: number | null = null

  return () => {
    if (rafId !== null) return
    rafId = requestAnimationFrame(() => {
      fn()
      rafId = null
    })
  }
}

// Reactive fixed-size FIFO buffer
export function useDataBuffer<T>(maxSize: number): {
  buffer: Ref<T[]>
  push: (item: T) => void
  clear: () => void
} {
  const buffer = ref<T[]>([]) as Ref<T[]>

  function push(item: T) {
    if (buffer.value.length >= maxSize) {
      buffer.value.splice(0, 1) // drop oldest
    }
    buffer.value.push(item)
  }

  function clear() {
    buffer.value = []
  }

  return { buffer, push, clear }
}
