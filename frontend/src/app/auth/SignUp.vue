<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useForm, useField } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod';
import { useAuthStore } from '../../stores/auth';
import { signUpSchema, type SignUpSchema } from './schemas/auth.schema';
import PasswordChecklist from '../../components/auth/PasswordChecklist.vue';
import AlertBanner from '../../components/ui/AlertBanner.vue';
import Logo from '../../components/ui/logo.vue';
import { Eye, EyeOff, Lock, Mail, User as UserIcon, ArrowRight, Loader2, Sparkles, ShieldCheck, BookOpen } from 'lucide-vue-next';

const router = useRouter();
const authStore = useAuthStore();

const showPassword = ref(false);
const clientError = ref<string | null>(null);

const { handleSubmit, errors, meta } = useForm<SignUpSchema>({
  validationSchema: toTypedSchema(signUpSchema),
  initialValues: {
    email: '',
    name: '',
    password: '',
  },
});

const { value: email } = useField<string>('email');
const { value: name } = useField<string>('name');
const { value: password } = useField<string>('password');

const onSubmit = handleSubmit(async (values) => {
  clientError.value = null;
  authStore.clearError();

  try {
    // Senior UX: Automatically authenticates upon successful signup
    await authStore.signup({
      email: values.email,
      name: values.name,
      password: values.password,
    });
    router.push('/dashboard');
  } catch (err: any) {
    clientError.value = err.message || 'Registration failed. Please try again.';
  }
});
</script>

<template>
  <div class="min-h-[calc(100vh-4rem)] flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8 bg-slate-50/60">
    <div class="max-w-5xl w-full bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-200/80 overflow-hidden grid grid-cols-1 lg:grid-cols-12 my-6">
      
      <!-- Left Hero Banner (Easygenerator Brand Showcase) -->
      <div class="lg:col-span-5 bg-slate-900 text-white p-8 lg:p-10 flex flex-col justify-between relative overflow-hidden">
        <!-- Ambient Glowing Brand Backdrop -->
        <div class="absolute -top-24 -left-24 w-72 h-72 bg-[#FC794B]/25 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute -bottom-24 -right-24 w-72 h-72 bg-[#FC794B]/20 rounded-full blur-3xl pointer-events-none"></div>

        <div class="relative z-10 space-y-6">
          <div class="flex items-center gap-3">
            <Logo color="white" class="h-9 w-auto" />
          </div>

          <div class="space-y-2 pt-2">
            <h2 class="text-2xl lg:text-3xl font-extrabold tracking-tight text-white leading-tight">
              Create e-learning in minutes, not weeks.
            </h2>
            <p class="text-slate-300 text-sm leading-relaxed">
              Join thousands of course authors empowering their teams with Easygenerator's intuitive authoring platform.
            </p>
          </div>

          <!-- Feature Highlights -->
          <div class="space-y-4 pt-4 border-t border-slate-800">
            <div class="flex items-start gap-3">
              <div class="w-8 h-8 rounded-lg bg-[#FC794B]/20 flex items-center justify-center shrink-0 mt-0.5 border border-[#FC794B]/30">
                <Sparkles class="w-4 h-4 text-[#FC794B]" />
              </div>
              <div>
                <h3 class="text-sm font-semibold text-white">AI-Powered Authoring</h3>
                <p class="text-xs text-slate-400">Generate engaging courses, quizzes, and modules instantly.</p>
              </div>
            </div>

            <div class="flex items-start gap-3">
              <div class="w-8 h-8 rounded-lg bg-[#FC794B]/20 flex items-center justify-center shrink-0 mt-0.5 border border-[#FC794B]/30">
                <ShieldCheck class="w-4 h-4 text-[#FC794B]" />
              </div>
              <div>
                <h3 class="text-sm font-semibold text-white">Enterprise Security</h3>
                <p class="text-xs text-slate-400">Protected with Argon2id, sliding session cookies & CSRF defense.</p>
              </div>
            </div>

            <div class="flex items-start gap-3">
              <div class="w-8 h-8 rounded-lg bg-[#FC794B]/20 flex items-center justify-center shrink-0 mt-0.5 border border-[#FC794B]/30">
                <BookOpen class="w-4 h-4 text-[#FC794B]" />
              </div>
              <div>
                <h3 class="text-sm font-semibold text-white">Zero Learning Curve</h3>
                <p class="text-xs text-slate-400">No complex training required. Start creating immediately.</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Trust Metric Banner -->
        <div class="relative z-10 pt-8 mt-8 border-t border-slate-800/80 flex items-center gap-3 text-xs text-slate-400">
          <div class="flex -space-x-2">
            <div class="w-7 h-7 rounded-full bg-[#FC794B] text-white flex items-center justify-center font-bold text-[10px] ring-2 ring-slate-900">EG</div>
            <div class="w-7 h-7 rounded-full bg-slate-700 text-slate-200 flex items-center justify-center font-bold text-[10px] ring-2 ring-slate-900">AI</div>
            <div class="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px] ring-2 ring-slate-900">✓</div>
          </div>
          <span>Trusted by 50,000+ course authors worldwide</span>
        </div>
      </div>

      <!-- Right Form Section -->
      <div class="lg:col-span-7 p-8 lg:p-12 flex flex-col justify-center bg-white">
        <div class="max-w-md w-full mx-auto space-y-6">
          
          <div>
            <span class="text-xs font-bold uppercase tracking-wider text-[#FC794B]">Get Started Free</span>
            <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
              Create your account
            </h1>
            <p class="mt-2 text-sm text-slate-600">
              Already have an account?
              <router-link to="/signin" class="font-semibold text-[#FC794B] hover:text-[#E86235] underline ml-1">
                Sign in here
              </router-link>
            </p>
          </div>

          <AlertBanner
            v-if="clientError || authStore.error"
            type="error"
            :message="clientError || authStore.error"
            @close="() => { clientError = null; authStore.clearError(); }"
          />

          <form @submit="onSubmit" class="space-y-4" novalidate>
            <!-- Email Field -->
            <div>
              <label for="email" class="block text-sm font-semibold text-slate-700">Email address</label>
              <div class="mt-1.5 relative rounded-xl shadow-xs">
                <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail class="w-5 h-5" />
                </div>
                <input
                  id="email"
                  v-model="email"
                  type="email"
                  autocomplete="email"
                  required
                  placeholder="author@easygenerator.com"
                  :class="[
                    'block w-full pl-11 pr-3.5 py-2.5 border rounded-xl focus:outline-none focus:ring-2 text-sm text-slate-900 placeholder-slate-400 transition-all',
                    errors.email
                      ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                      : 'border-slate-200 focus:ring-[#FC794B]/20 focus:border-[#FC794B]',
                  ]"
                />
              </div>
              <p v-if="errors.email" class="mt-1.5 text-xs font-medium text-red-600">
                {{ errors.email }}
              </p>
            </div>

            <!-- Name Field -->
            <div>
              <label for="name" class="block text-sm font-semibold text-slate-700">Full Name</label>
              <div class="mt-1.5 relative rounded-xl shadow-xs">
                <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <UserIcon class="w-5 h-5" />
                </div>
                <input
                  id="name"
                  v-model="name"
                  type="text"
                  autocomplete="name"
                  required
                  placeholder="Jane Author"
                  :class="[
                    'block w-full pl-11 pr-3.5 py-2.5 border rounded-xl focus:outline-none focus:ring-2 text-sm text-slate-900 placeholder-slate-400 transition-all',
                    errors.name
                      ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                      : 'border-slate-200 focus:ring-[#FC794B]/20 focus:border-[#FC794B]',
                  ]"
                />
              </div>
              <p v-if="errors.name" class="mt-1.5 text-xs font-medium text-red-600">
                {{ errors.name }}
              </p>
            </div>

            <!-- Password Field -->
            <div>
              <label for="password" class="block text-sm font-semibold text-slate-700">Password</label>
              <div class="mt-1.5 relative rounded-xl shadow-xs">
                <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock class="w-5 h-5" />
                </div>
                <input
                  id="password"
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  autocomplete="new-password"
                  required
                  placeholder="••••••••"
                  :class="[
                    'block w-full pl-11 pr-11 py-2.5 border rounded-xl focus:outline-none focus:ring-2 text-sm text-slate-900 placeholder-slate-400 transition-all',
                    errors.password
                      ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                      : 'border-slate-200 focus:ring-[#FC794B]/20 focus:border-[#FC794B]',
                  ]"
                />
                <button
                  type="button"
                  @click="showPassword = !showPassword"
                  class="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  aria-label="Toggle password visibility"
                >
                  <EyeOff v-if="showPassword" class="w-5 h-5" />
                  <Eye v-else class="w-5 h-5" />
                </button>
              </div>

              <!-- Password Requirements Checklist Component -->
              <PasswordChecklist :password="password || ''" />
            </div>

            <!-- Submit Button -->
            <div class="pt-2">
              <button
                id="signup-submit-button"
                type="submit"
                :disabled="authStore.isLoading || !meta.valid"
                class="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-md shadow-[#FC794B]/20 text-sm font-bold text-white bg-[#FC794B] hover:bg-[#E86235] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FC794B] disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                <Loader2 v-if="authStore.isLoading" class="w-4 h-4 animate-spin" />
                <span v-else>Create Account</span>
                <ArrowRight v-if="!authStore.isLoading" class="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </div>

    </div>
  </div>
</template>
