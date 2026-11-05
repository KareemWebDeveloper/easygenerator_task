<script setup lang="ts">
import { useAuthStore } from '../../stores/auth';
import { useRouter } from 'vue-router';
import Logo from '../ui/logo.vue';
import { LogOut, User as UserIcon } from 'lucide-vue-next';

const authStore = useAuthStore();
const router = useRouter();

async function handleLogout() {
  await authStore.logout();
  router.push('/signin');
}
</script>

<template>
  <header class="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
      <router-link to="/dashboard" class="flex items-center gap-3 group transition-opacity hover:opacity-95">
        <Logo class="h-8 w-auto" />
        <span class="hidden sm:inline-flex items-center text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#FFF2ED] text-[#FC794B] border border-[#FDDCD0]">
          Auth Portal
        </span>
      </router-link>

      <nav class="flex items-center gap-3">
        <template v-if="authStore.isAuthenticated && authStore.user">
          <div class="hidden sm:flex items-center gap-2 text-sm text-slate-700 bg-orange-50/50 px-3 py-1.5 rounded-lg border border-orange-100">
            <UserIcon class="w-4 h-4 text-[#FC794B]" />
            <span class="font-semibold text-slate-900">{{ authStore.user.name }}</span>
            <span class="text-xs text-slate-500 font-mono">({{ authStore.user.email }})</span>
          </div>

          <button
            id="logout-button"
            @click="handleLogout"
            :disabled="authStore.isLoading"
            class="inline-flex items-center gap-2 px-3.5 py-1.5 text-sm font-semibold rounded-lg text-slate-700 hover:text-red-600 bg-slate-100 hover:bg-red-50 border border-slate-200 hover:border-red-200 transition-all cursor-pointer disabled:opacity-50"
          >
            <LogOut class="w-4 h-4" />
            <span>Sign out</span>
          </button>
        </template>
        <template v-else>
          <router-link
            to="/signin"
            class="text-sm font-medium text-slate-700 hover:text-[#FC794B] transition-colors px-3 py-2 rounded-lg"
            active-class="text-[#FC794B] font-semibold"
          >
            Sign in
          </router-link>
          <router-link
            to="/signup"
            class="text-sm font-semibold text-white bg-[#FC794B] hover:bg-[#E86235] transition-all px-4 py-2 rounded-lg shadow-sm hover:shadow-md"
          >
            Sign up
          </router-link>
        </template>
      </nav>
    </div>
  </header>
</template>
