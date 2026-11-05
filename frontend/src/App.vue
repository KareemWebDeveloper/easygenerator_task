<script setup lang="ts">
import AppNavbar from './components/common/AppNavbar.vue';
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex flex-col font-sans">
    <AppNavbar />
    <div class="flex-1">
      <router-view />
    </div>
  </div>
</template>

