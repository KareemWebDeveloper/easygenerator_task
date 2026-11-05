<script setup lang="ts">
import { computed } from 'vue';
import { Check, X } from 'lucide-vue-next';

const props = defineProps<{
  password: string;
}>();

const hasMinLength = computed(() => props.password.length >= 8);
const hasLetter = computed(() => /[a-zA-Z]/.test(props.password));
const hasNumber = computed(() => /[0-9]/.test(props.password));
const hasSpecial = computed(() => /[^a-zA-Z0-9]/.test(props.password));

const rules = computed(() => [
  { label: 'Minimum 8 characters', met: hasMinLength.value },
  { label: 'At least one letter (a-z, A-Z)', met: hasLetter.value },
  { label: 'At least one number (0-9)', met: hasNumber.value },
  { label: 'At least one special character (!@#$%^&*)', met: hasSpecial.value },
]);
</script>

<template>
  <div class="mt-2.5 p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs space-y-2">
    <div class="font-semibold text-slate-700 flex items-center justify-between">
      <span>Password requirements</span>
      <span class="text-[11px] font-normal text-slate-400">All rules required</span>
    </div>
    <ul class="space-y-1.5">
      <li
        v-for="(rule, index) in rules"
        :key="index"
        :class="[
          'flex items-center gap-2 transition-all duration-200',
          rule.met ? 'text-emerald-700 font-medium' : 'text-slate-500',
        ]"
      >
        <span
          :class="[
            'w-4 h-4 rounded-full flex items-center justify-center text-[10px] shrink-0 transition-all',
            rule.met ? 'bg-emerald-500 text-white shadow-xs' : 'bg-slate-200 text-slate-400',
          ]"
        >
          <Check v-if="rule.met" class="w-3 h-3 stroke-[3]" />
          <X v-else class="w-3 h-3 stroke-[3]" />
        </span>
        <span>{{ rule.label }}</span>
      </li>
    </ul>
  </div>
</template>
