<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import SbIcon from "@/components/ui/SbIcon.vue";

const { t } = useI18n();

// ─── Types & constants ────────────────────────────────────────────────────────

interface PgColor {
  id: string;
  value: string;
  name: string;
}

const PG_COLORS: PgColor[] = [
  { id: "arcane", value: "#8B5CF6", name: "Arcane" },
  { id: "tide", value: "#2DD4BF", name: "Tide" },
  { id: "crown", value: "#F4B942", name: "Crown" },
  { id: "ember", value: "#E8654E", name: "Ember" },
  { id: "grove", value: "#4BAE6E", name: "Grove" },
  { id: "azure", value: "#4A8FE7", name: "Azure" },
];

// ─── Props / emits ────────────────────────────────────────────────────────────

const props = defineProps<{
  open:              boolean
  submitting?:       boolean
  serverInviteCode?: string
  serverPodId?:      string
}>()

const emit = defineEmits<{
  close:   []
  submit:  [name: string]
  openPod: [id: string]
}>()

// ─── State ────────────────────────────────────────────────────────────────────

type Step = "form" | "success";

const step = ref<Step>("form");
const name = ref("");
const colorId = ref(PG_COLORS[0]!.id);
const copied = ref(false);
const nameFocused = ref(false);
const nameInput = ref<HTMLInputElement | null>(null);

watch(
  () => props.open,
  (v) => {
    if (!v) return;
    step.value = "form";
    name.value = "";
    colorId.value = PG_COLORS[0]!.id;
    copied.value = false;
    nextTick(() => setTimeout(() => nameInput.value?.focus(), 320));
  },
);

// Advance to success once the parent provides the server invite code
watch(
  () => props.serverInviteCode,
  (code) => { if (code) step.value = "success" },
);

// ─── Derived ──────────────────────────────────────────────────────────────────

const trimmed = computed(() => name.value.trim());
const canSubmit = computed(() => trimmed.value.length >= 2 && !props.submitting);
const color = computed(() => PG_COLORS.find((c) => c.id === colorId.value) ?? PG_COLORS[0]!);

// Avatar: darken hex color for gradient end
function hexDarken(hex: string, amt: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const f = (n: number) => Math.max(0, Math.min(255, Math.round(n * (1 - amt))));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}

const avatarStyle = computed(() => {
  const c = color.value.value;
  const initial = trimmed.value.charAt(0).toUpperCase();
  const filled = !!initial;
  return {
    background: filled
      ? `radial-gradient(circle at 30% 30%, ${c}, ${hexDarken(c, 0.35)})`
      : `radial-gradient(circle at 30% 30%, ${c}38, ${c}14 70%)`,
    color: filled ? "#fff" : c,
    border: filled ? "1px solid rgba(255,255,255,0.10)" : `1.5px dashed ${c}66`,
    boxShadow: filled ? `0 8px 24px ${c}38, inset 0 1px 0 rgba(255,255,255,0.18)` : "none",
  };
});

const avatarChar = computed(() => trimmed.value.charAt(0).toUpperCase() || "?");

// ─── Actions ──────────────────────────────────────────────────────────────────

function handleSubmit() {
  if (!canSubmit.value) return;
  emit("submit", trimmed.value);
}

async function handleCopy() {
  try {
    await navigator.clipboard.writeText(props.serverInviteCode ?? "");
  } catch {
    /* no-op */
  }
  copied.value = true;
  setTimeout(() => { copied.value = false; }, 1800);
}

function handleOpenPod() {
  emit("openPod", props.serverPodId ?? "");
  emit("close");
}
</script>

<template>
  <!-- Scrim -->
  <div
    class="fixed inset-0 z-30 transition-[background] duration-260 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
    :class="
      open
        ? 'bg-[rgba(6,7,13,0.62)] pointer-events-auto backdrop-blur-[3px]'
        : 'bg-transparent pointer-events-none'
    "
    @click="emit('close')"
  />

  <!-- Sheet -->
  <div
    class="fixed bottom-0 left-0 right-0 z-40 rounded-t-3xl border-t border-white/10 overflow-y-auto bg-bg-1/96 backdrop-blur-[20px] backdrop-saturate-140 shadow-[0_-16px_40px_rgba(0,0,0,0.55)] pt-2.5 px-5 pb-8 max-h-[92%] transition-transform duration-260 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
    :inert="!open"
    :class="open ? 'translate-y-0' : 'translate-y-full'"
  >
    <!-- ── FORM STEP ──────────────────────────────────────────────────────── -->
    <template v-if="step === 'form'">
      <!-- Drag handle -->
      <div class="w-9 h-1 rounded-full mx-auto mb-2.5 bg-overlay-5" />

      <!-- Title row -->
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <div class="font-display font-bold text-fg-0 text-[24px] tracking-headline leading-tight">
            {{ t('playgroups.create.title') }}
          </div>
          <div class="text-body-sm text-fg-2 mt-1.5 leading-[1.45]">
            {{ t('playgroups.create.intro') }}
          </div>
        </div>
        <button
          class="w-8 h-8 rounded-full flex items-center justify-center shrink-0 cursor-pointer border-0 bg-divider"
          :aria-label="t('common.close')"
          @click="emit('close')"
        >
          <SbIcon name="x" :size="16" color="#8A88A3" />
        </button>
      </div>

      <!-- Name field -->
      <label class="block font-body font-bold text-meta tracking-[0.08em] uppercase text-fg-2 mb-2"
        >{{ t('playgroups.create.podName') }}</label
      >
      <input
        ref="nameInput"
        v-model="name"
        :placeholder="t('playgroups.create.podNamePlaceholder')"
        maxlength="32"
        class="w-full h-13 font-body text-fg-0 outline-none box-border px-4 bg-bg-0 rounded-lg text-[16px] font-medium border transition-[border-color] duration-160 ease-linear"
        :class="nameFocused ? 'border-arcane/60' : 'border-divider-strong'"
        @focus="nameFocused = true"
        @blur="nameFocused = false"
        @keydown.enter="handleSubmit"
      />
      <div class="flex justify-between items-center mt-1.5 pl-0.5">
        <div class="text-meta text-fg-3">{{ t('playgroups.create.podNameHint') }}</div>
        <div class="font-mono text-[10px] text-fg-3">{{ trimmed.length }}/32</div>
      </div>

      <!-- Color picker -->
      <div class="mt-5.5">
        <div class="font-body font-bold text-meta tracking-[0.08em] uppercase text-fg-2 mb-3">
          {{ t('playgroups.create.color') }}
        </div>
        <div class="flex gap-2.5 items-center">
          <button
            v-for="c in PG_COLORS"
            :key="c.id"
            :aria-label="t('playgroups.create.colors.' + c.id)"
            class="relative w-9 h-9 rounded-full border-0 cursor-pointer flex items-center justify-center p-0 transition-[box-shadow] duration-160 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
            :style="{
              background: c.value,
              boxShadow:
                colorId === c.id
                  ? `0 0 0 2px #06070D, 0 0 0 4px ${c.value}, inset 0 1px 0 rgba(255,255,255,0.25)`
                  : 'inset 0 1px 0 rgba(255,255,255,0.18)',
            }"
            @click="colorId = c.id"
          >
            <SbIcon v-if="colorId === c.id" name="check" :size="16" :stroke="2.6" color="#fff" />
          </button>
        </div>
      </div>

      <!-- Admin note -->
      <div
        class="flex items-start gap-2.5 mt-6 py-3 px-3.5 bg-arcane/8 border border-arcane/18 rounded-lg"
      >
        <div
          class="flex items-center justify-center shrink-0 w-7 h-7 rounded-full bg-arcane/22 text-arcane-2"
        >
          <SbIcon name="crown" :size="15" color="#A78BFA" />
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-body font-semibold text-fg-0 text-body-sm leading-[1.3]">
            {{ t('playgroups.create.adminNoteTitle') }}
          </div>
          <div class="text-fg-2 text-caption mt-0.5 leading-[1.4]">
            {{ t('playgroups.create.adminNoteSub') }}
          </div>
        </div>
      </div>

      <!-- Create button -->
      <button
        :disabled="!canSubmit"
        class="w-full h-13 mt-4.5 border-0 font-body font-bold flex items-center justify-center gap-2 rounded-[14px] text-body-lg tracking-snug"
        :class="
          canSubmit
            ? 'bg-arcane text-white cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]'
            : 'bg-bg-2 text-fg-3 cursor-not-allowed'
        "
        @click="handleSubmit"
      >
        {{ submitting ? t('playgroups.create.creating') : t('playgroups.create.create') }}
        <SbIcon v-if="!submitting" name="arrow" :size="16" :stroke="2.4" :color="canSubmit ? '#fff' : '#5A586E'" />
      </button>
    </template>

    <!-- ── SUCCESS STEP ───────────────────────────────────────────────────── -->
    <template v-else>
      <!-- Drag handle -->
      <div class="w-9 h-1 rounded-full mx-auto mb-4.5 bg-overlay-5" />

      <!-- Avatar + check badge -->
      <div class="flex justify-center mt-2">
        <div class="relative">
          <div
            class="w-21 h-21 rounded-full flex items-center justify-center font-display font-bold text-[38px] tracking-tight"
            :style="avatarStyle"
          >
            {{ avatarChar }}
          </div>
          <div
            class="absolute -right-0.5 -bottom-0.5 flex items-center justify-center w-7.5 h-7.5 rounded-full bg-crown text-bg-0 border-[3px] border-bg-1"
          >
            <SbIcon name="check" :size="14" :stroke="3" color="#06070D" />
          </div>
        </div>
      </div>

      <!-- Headline -->
      <div class="text-center mt-4.5">
        <div class="font-display font-bold text-fg-0 text-[26px] tracking-headline leading-tight">
          {{ t('playgroups.create.isLive', { name: trimmed || t('playgroups.create.yourPod') }) }}
        </div>
        <div class="text-fg-2 mt-2 leading-[1.45] text-body-sm">
          {{ t('playgroups.create.successSub') }}
        </div>
      </div>

      <!-- Invite code card -->
      <div
        class="mt-5.5 relative overflow-hidden bg-bg-0 border border-dashed border-arcane-edge rounded-[14px] pt-4 pb-3.5 px-4"
      >
        <!-- Glow -->
        <div
          aria-hidden="true"
          class="absolute pointer-events-none -top-12 -right-7.5 w-35 h-35 bg-[radial-gradient(circle,rgba(139,92,246,0.16),transparent_65%)]"
        />
        <div class="relative z-10">
          <div class="font-body font-bold text-[10px] text-arcane-2 tracking-eyebrow uppercase">
            {{ t('playgroups.create.inviteCode') }}
          </div>
          <div class="flex items-center justify-between mt-2 gap-2.5">
            <div
              class="font-mono font-bold text-fg-0 text-display-sm tracking-[0.04em] tabular-nums"
            >
              {{ serverInviteCode }}
            </div>
            <button
              class="h-9 flex items-center gap-1.5 border cursor-pointer font-body font-bold px-3.5 rounded-md text-caption tracking-[0.04em] uppercase transition-[background,color,border-color] duration-160 ease-linear"
              :class="
                copied
                  ? 'bg-tide/16 text-tide-2 border-tide/32'
                  : 'bg-divider text-fg-0 border-divider-strong'
              "
              @click="handleCopy"
            >
              <SbIcon
                :name="copied ? 'check' : 'edit'"
                :size="13"
                :stroke="2.4"
                :color="copied ? '#2DD4BF' : '#F5F4FB'"
              />
              {{ copied ? t('playgroups.create.copied') : t('playgroups.create.copy') }}
            </button>
          </div>
          <div class="flex items-center gap-1.5 mt-3 text-meta text-fg-3">
            <SbIcon name="timer" :size="12" color="#5A586E" />
            {{ t('playgroups.create.expiresNote') }}
          </div>
        </div>
      </div>

      <!-- Share row -->
      <div class="flex gap-2 mt-3">
        <button
          v-for="btn in [
            { key: 'messages', icon: 'bell' },
            { key: 'discord', icon: 'pods' },
            { key: 'more', icon: 'more' },
          ] as const"
          :key="btn.key"
          class="flex-1 flex flex-col items-center gap-1.5 cursor-pointer border font-body font-semibold py-2.5 px-2 bg-overlay-1 border-divider rounded-lg text-meta text-fg-1"
        >
          <SbIcon :name="btn.icon" :size="18" color="#C4C1D8" />
          {{ t('playgroups.create.share.' + btn.key) }}
        </button>
      </div>

      <!-- Open playgroup CTA -->
      <button
        class="w-full h-13 mt-5 border-0 font-body font-bold flex items-center justify-center gap-2 cursor-pointer bg-arcane text-white rounded-[14px] text-body-lg tracking-snug shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
        @click="handleOpenPod"
      >
        {{ t('playgroups.create.openPlaygroup') }}
        <SbIcon name="arrow" :size="16" :stroke="2.4" color="#fff" />
      </button>

      <!-- Invite later -->
      <button
        class="w-full h-11 mt-2 border-0 bg-transparent font-body font-semibold cursor-pointer text-body-sm text-fg-2"
        @click="emit('close')"
      >
        {{ t('playgroups.create.inviteLater') }}
      </button>
    </template>
  </div>
</template>
