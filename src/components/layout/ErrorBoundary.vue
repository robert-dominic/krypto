<script lang="ts">
import { defineComponent, ref } from 'vue'

export default defineComponent({
  name: 'ErrorBoundary',

  props: {
    fallbackTitle: { type: String, default: 'Something went wrong' },
    showRetry:     { type: Boolean, default: true },
  },

  emits: ['error'],

  setup() {
    const caught   = ref<Error | null>(null)
    const hasError = ref(false)

    function retry() {
      caught.value   = null
      hasError.value = false
    }

    return { caught, hasError, retry }
  },

  errorCaptured(err: unknown, _instance, info) {
    const error = err instanceof Error ? err : new Error(String(err))
    console.error(`[ErrorBoundary] ${new Date().toISOString()} — ${info}`, error)
    this.caught   = error
    this.hasError = true
    this.$emit('error', error)
    // Return false to stop error propagation up the component tree
    return false
  },
})
</script>

<template>
  <!-- Fallback UI shown when a descendant throws -->
  <div
    v-if="hasError"
    class="flex items-center justify-center p-6"
  >
    <div class="max-w-sm w-full rounded-lg border border-accent-red/50 bg-bg-secondary p-6 text-center">
      <div class="text-3xl mb-3">⚠</div>

      <h3 class="text-base font-semibold text-text-primary mb-2">
        {{ fallbackTitle }}
      </h3>

      <p v-if="caught" class="text-xs text-text-secondary font-mono break-words mb-4 leading-relaxed">
        {{ caught.message.slice(0, 100) }}{{ caught.message.length > 100 ? '…' : '' }}
      </p>

      <button
        v-if="showRetry"
        class="px-4 py-1.5 text-sm font-medium rounded border border-accent-red
               text-accent-red hover:bg-accent-red hover:text-bg-primary
               transition-colors duration-150 focus:outline-none"
        @click="retry"
      >
        Retry
      </button>
    </div>
  </div>

  <!-- Normal render — slot content passes through untouched -->
  <slot v-else />
</template>
