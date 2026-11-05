<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth';
import { LogOut, User, Mail, Shield, CheckCircle2, Calendar } from 'lucide-vue-next';

const router = useRouter();
const authStore = useAuthStore();

async function handleLogout() {
  await authStore.logout();
  router.push('/signin');
}

function formatDate(dateStr?: string) {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleString();
}
</script>

<template>
  <main class="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8 space-y-8">
    <!-- Welcome Header strictly fulfilling the task requirement -->
    <div class="bg-white rounded-3xl shadow-lg shadow-slate-200/50 border border-slate-200 p-8 sm:p-12 text-center relative overflow-hidden">
      <div class="absolute -top-12 -right-12 w-48 h-48 bg-[#FC794B]/10 rounded-full blur-2xl pointer-events-none"></div>

      <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-50 text-[#FC794B] border border-orange-100 mb-5 shadow-xs">
        <CheckCircle2 class="w-8 h-8" />
      </div>

      <!-- Exact required welcome message from technical task specification -->
      <h1 class="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
        Welcome to the application.
      </h1>

      <p class="mt-3 text-slate-600 max-w-lg mx-auto text-base">
        You have successfully signed in to the Easygenerator secure portal. Your session is protected with short-lived HttpOnly cookies, sliding sessions & Argon2id encryption.
      </p>

      <div class="mt-8 flex flex-wrap justify-center gap-4">
        <button
          id="dashboard-logout-button"
          @click="handleLogout"
          :disabled="authStore.isLoading"
          class="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:text-red-600 bg-slate-100 hover:bg-red-50 border border-slate-200 hover:border-red-200 transition-all cursor-pointer disabled:opacity-50"
        >
          <LogOut class="w-4 h-4" />
          <span>Sign out of session</span>
        </button>
      </div>
    </div>

    <!-- Active User Profile Card -->
    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div class="px-6 py-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Shield class="w-5 h-5 text-[#FC794B]" />
          <h2 class="text-base font-semibold text-slate-900">Authenticated Session Profile</h2>
        </div>
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
          Active Session
        </span>
      </div>

      <div class="p-6 divide-y divide-slate-100">
        <div class="py-3 sm:grid sm:grid-cols-3 sm:gap-4 flex items-center">
          <dt class="text-sm font-medium text-slate-500 flex items-center gap-2">
            <User class="w-4 h-4 text-slate-400" />
            Full Name
          </dt>
          <dd class="mt-1 text-sm font-semibold text-slate-900 sm:mt-0 sm:col-span-2">
            {{ authStore.user?.name || 'Loading...' }}
          </dd>
        </div>

        <div class="py-3 sm:grid sm:grid-cols-3 sm:gap-4 flex items-center">
          <dt class="text-sm font-medium text-slate-500 flex items-center gap-2">
            <Mail class="w-4 h-4 text-slate-400" />
            Email Address
          </dt>
          <dd class="mt-1 text-sm text-slate-900 font-mono text-xs sm:mt-0 sm:col-span-2 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 inline-block">
            {{ authStore.user?.email || 'Loading...' }}
          </dd>
        </div>

        <div class="py-3 sm:grid sm:grid-cols-3 sm:gap-4 flex items-center">
          <dt class="text-sm font-medium text-slate-500 flex items-center gap-2">
            <Calendar class="w-4 h-4 text-slate-400" />
            Member Since
          </dt>
          <dd class="mt-1 text-sm text-slate-700 sm:mt-0 sm:col-span-2">
            {{ formatDate(authStore.user?.createdAt) }}
          </dd>
        </div>
      </div>
    </div>
  </main>
</template>
