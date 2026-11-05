<script setup lang="ts">
import { AlertCircle, CheckCircle2, X } from 'lucide-vue-next';

defineProps<{
  type?: 'error' | 'success';
  message?: string | null;
}>();

defineEmits<{
  (e: 'close'): void;
}>();
</script>

<template>
  <div
    v-if="message"
    :class="[
      'flex items-start gap-3 p-3.5 rounded-lg border text-sm transition-all',
      type === 'success'
        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
        : 'bg-red-50 border-red-200 text-red-800',
    ]"
    role="alert"
  >
    <CheckCircle2 v-if="type === 'success'" class="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
    <AlertCircle v-else class="w-5 h-5 text-red-600 shrink-0 mt-0.5" />

    <div class="flex-1 font-medium">
      {{ message }}
    </div>

    <button
      type="button"
      @click="$emit('close')"
      class="text-slate-400 hover:text-slate-600 cursor-pointer p-0.5 rounded transition-colors"
      aria-label="Dismiss alert"
    >
      <X class="w-4 h-4" />
    </button>
  </div>
</template>
