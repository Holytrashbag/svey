<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useNav } from "@/composables/useNav";
import { authClient } from "@/lib/auth-client";
import { api } from "@/lib/api";
import { useProfileStore } from "@/stores/useProfileStore";
import { useLocaleStore, type AppLocale } from "@/stores/useLocaleStore";
import SbBottomNav from "@/components/ui/SbBottomNav.vue";
import SbAvatar from "@/components/ui/SbAvatar.vue";
import SbIcon from "@/components/ui/SbIcon.vue";
import SbStat from "@/components/ui/SbStat.vue";

const { t, d } = useI18n();

// ─── Session ──────────────────────────────────────────────────────────────────

const session = authClient.useSession();
const user = computed(() => session.value?.data?.user);
const displayName = computed(() => user.value?.name ?? t("profile.defaultName"));
const email = computed(() => user.value?.email ?? "");
const sessionAvatarUrl = computed(() => user.value?.image ?? undefined)
const localAvatarUrl = ref<string | undefined>(undefined)
const avatarUrl = computed(() => localAvatarUrl.value ?? sessionAvatarUrl.value);
const memberSinceDate = computed(() => {
  const dt = user.value?.createdAt;
  if (!dt) return "";
  const iso = typeof dt === "string" ? dt : dt.toISOString();
  return d(new Date(iso), "founded");
});

// ─── Language ─────────────────────────────────────────────────────────────────

const localeStore = useLocaleStore();
// Endonyms (each language named in itself) — conventionally left untranslated.
const localeLabels: Record<AppLocale, string> = { en: "English", de: "Deutsch" };

// ─── Email verification ─────────────────────────────────────────────────────────

// Default true so the "not verified" hint never flashes while the session loads.
const emailVerified = computed(() => user.value?.emailVerified ?? true);
const resendBusy = ref(false);
const resendDone = ref(false);

async function resendVerification() {
  if (!email.value || resendBusy.value) return;
  resendBusy.value = true;
  try {
    await authClient.sendVerificationEmail({ email: email.value, callbackURL: `${window.location.origin}/home` });
    resendDone.value = true;
  } finally {
    resendBusy.value = false;
  }
}

// ─── Stats ────────────────────────────────────────────────────────────────────

const profileStore = useProfileStore();
onMounted(() => {
  profileStore.fetchStats();
  profileStore.fetchDeckStats();
});

// ─── Menu ─────────────────────────────────────────────────────────────────────

const menuOpen = ref(false);

// ─── Edit mode ────────────────────────────────────────────────────────────────

const isEditing = ref(false);
const editedName = ref("");
const isSaving = ref(false);

function startEdit() {
  editedName.value = displayName.value;
  isEditing.value = true;
}

function cancelEdit() {
  isEditing.value = false;
}

async function saveEdit() {
  const trimmed = editedName.value.trim();
  if (!trimmed || trimmed === displayName.value) {
    isEditing.value = false;
    return;
  }
  isSaving.value = true;
  try {
    await authClient.updateUser({ name: trimmed });
    isEditing.value = false;
  } finally {
    isSaving.value = false;
  }
}

// ─── Avatar upload ────────────────────────────────────────────────────────────

const fileInput = ref<HTMLInputElement | null>(null);
const isUploadingAvatar = ref(false);
const avatarError = ref("");

function pickAvatar() {
  fileInput.value?.click();
}

async function onFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  avatarError.value = "";
  isUploadingAvatar.value = true;
  try {
    const form = new FormData();
    form.append("file", file);
    const { avatarUrl: newUrl } = await api.upload<{ avatarUrl: string }>("/users/me/avatar", form);
    localAvatarUrl.value = newUrl;
  } catch (err) {
    avatarError.value = err instanceof Error ? err.message : t("profile.uploadFailed");
  } finally {
    isUploadingAvatar.value = false;
    if (target) target.value = "";
  }
}

// ─── Sign out ─────────────────────────────────────────────────────────────────

const router = useRouter();

async function signOut() {
  await authClient.signOut();
  router.push("/");
}

// ─── Delete account ─────────────────────────────────────────────────────────────

const showDeleteModal = ref(false);
const deleteConfirmText = ref("");
const deleteBusy = ref(false);
const deleteError = ref<string | null>(null);

function openDeleteModal() {
  menuOpen.value = false;
  deleteConfirmText.value = "";
  deleteError.value = null;
  showDeleteModal.value = true;
}

async function deleteAccount() {
  if (deleteConfirmText.value !== "DELETE" || deleteBusy.value) return;
  deleteBusy.value = true;
  deleteError.value = null;
  try {
    const { error } = await authClient.deleteUser();
    if (error) {
      deleteError.value = error.message ?? t("profile.delete.couldNotDelete");
      return;
    }
    await router.push("/");
  } catch (e) {
    deleteError.value = e instanceof Error ? e.message : t("profile.delete.couldNotDelete");
  } finally {
    deleteBusy.value = false;
  }
}

// ─── Navigation ───────────────────────────────────────────────────────────────

const { onNav } = useNav();
</script>

<template>
  <div class="relative h-screen bg-bg-0 text-fg-0 overflow-hidden">
    <!-- Top-right menu / cancel -->
    <div class="absolute right-4 z-20 top-13 pointer-events-none">
      <!-- Cancel shown only while editing -->
      <button
        v-if="isEditing"
        class="flex items-center gap-1.5 cursor-pointer border h-9 px-3 rounded-full bg-scrim-soft backdrop-blur-md border-overlay-2 text-fg-0 pointer-events-auto text-caption font-semibold"
        @click="cancelEdit"
      >
        <SbIcon name="x" :size="14" />
        {{ t("common.cancel") }}
      </button>

      <!-- More menu -->
      <div v-else class="relative pointer-events-auto">
        <button
          class="flex items-center justify-center w-9 h-9 cursor-pointer border rounded-full bg-scrim-soft backdrop-blur-md border-overlay-2 text-fg-0"
          @click="menuOpen = !menuOpen"
        >
          <SbIcon name="more" :size="16" />
        </button>

        <div
          v-if="menuOpen"
          class="absolute right-0 top-10 bg-bg-1 border border-overlay-2 rounded-xl overflow-hidden shadow-xl min-w-40 z-10"
        >
          <button
            class="w-full flex items-center gap-2.5 px-4 py-3 text-body-sm text-fg-0 font-semibold hover:bg-bg-2 cursor-pointer text-left"
            @click="startEdit(); menuOpen = false"
          >
            <SbIcon name="edit" :size="15" />
            {{ t("profile.menu.editProfile") }}
          </button>
          <div class="border-t border-divider-soft" />
          <div class="px-4 pt-2.5 pb-1 text-[10px] text-fg-3 uppercase tracking-widest font-semibold">
            {{ t("profile.menu.language") }}
          </div>
          <button
            v-for="loc in localeStore.available"
            :key="loc"
            class="w-full flex items-center justify-between gap-2.5 px-4 py-2.5 text-body-sm text-fg-0 font-semibold hover:bg-bg-2 cursor-pointer text-left"
            @click="localeStore.setLocale(loc); menuOpen = false"
          >
            {{ localeLabels[loc] }}
            <SbIcon
              v-if="localeStore.locale === loc"
              name="check"
              :size="14"
              :stroke="2.2"
              class="text-arcane-2"
            />
          </button>
          <div class="border-t border-divider-soft" />
          <RouterLink
            to="/impressum"
            class="w-full flex items-center px-4 py-3 text-body-sm text-fg-1 font-semibold hover:bg-bg-2 cursor-pointer text-left no-underline"
            @click="menuOpen = false"
          >
            Impressum
          </RouterLink>
          <RouterLink
            to="/datenschutz"
            class="w-full flex items-center px-4 py-3 text-body-sm text-fg-1 font-semibold hover:bg-bg-2 cursor-pointer text-left no-underline"
            @click="menuOpen = false"
          >
            Datenschutz
          </RouterLink>
          <RouterLink
            to="/terms"
            class="w-full flex items-center px-4 py-3 text-body-sm text-fg-1 font-semibold hover:bg-bg-2 cursor-pointer text-left no-underline"
            @click="menuOpen = false"
          >
            Nutzungsbedingungen
          </RouterLink>
          <div class="border-t border-divider-soft" />
          <button
            class="w-full flex items-center gap-2.5 px-4 py-3 text-body-sm text-danger font-semibold hover:bg-bg-2 cursor-pointer text-left"
            @click="signOut"
          >
            <SbIcon name="back" :size="15" />
            {{ t("profile.menu.signOut") }}
          </button>
          <div class="border-t border-divider-soft" />
          <button
            class="w-full flex items-center gap-2.5 px-4 py-3 text-body-sm text-danger font-semibold hover:bg-bg-2 cursor-pointer text-left"
            @click="openDeleteModal"
          >
            <SbIcon name="x" :size="15" />
            {{ t("profile.menu.deleteAccount") }}
          </button>
        </div>
      </div>
    </div>

    <!-- Click-outside overlay to close menu -->
    <div v-if="menuOpen" class="fixed inset-0 z-10" @click="menuOpen = false" />

    <!-- Scrollable content -->
    <div class="h-full overflow-y-auto overflow-x-hidden pt-13 pb-32">
      <!-- Hero -->
      <div
        class="px-5 pt-7 pb-8 bg-linear-to-b bg-bg-0 flex flex-col items-center text-center gap-3"
      >
        <!-- Avatar with optional upload trigger -->
        <div class="relative">
          <SbAvatar :name="displayName" :size="72" :image-url="avatarUrl" />
          <button
            v-if="isEditing"
            class="absolute inset-0 rounded-full flex items-center justify-center bg-black/50 cursor-pointer"
            :class="isUploadingAvatar && 'cursor-wait'"
            :disabled="isUploadingAvatar"
            @click="pickAvatar"
          >
            <SbIcon v-if="!isUploadingAvatar" name="camera" :size="20" class="text-white" />
            <span v-else class="text-white text-[10px] font-semibold">...</span>
          </button>
          <input
            ref="fileInput"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            class="hidden"
            @change="onFileChange"
          />
        </div>

        <p v-if="avatarError" class="text-danger text-caption">{{ avatarError }}</p>

        <!-- Static identity -->
        <div v-if="!isEditing" class="flex flex-col items-center gap-1">
          <div
            class="font-display font-bold text-display-sm tracking-tight text-fg-0 leading-tight"
          >
            {{ displayName }}
          </div>
          <div class="text-fg-2 text-body-sm">{{ email }}</div>

          <!-- Email verification hint -->
          <div v-if="!emailVerified && email" class="flex items-center gap-2 mt-0.5">
            <span class="text-[10px] font-semibold uppercase tracking-widest text-crown">{{ t("profile.emailNotVerified") }}</span>
            <span class="text-fg-4">·</span>
            <button
              v-if="!resendDone"
              type="button"
              class="text-caption text-arcane-2 hover:text-fg-0 transition-colors disabled:opacity-50 cursor-pointer"
              :disabled="resendBusy"
              @click="resendVerification"
            >{{ resendBusy ? t("profile.sending") : t("profile.resend") }}</button>
            <span v-else class="text-caption text-fg-3">{{ t("profile.sent") }} &check;</span>
          </div>

          <div
            v-if="memberSinceDate"
            class="text-fg-3 text-[10px] font-semibold uppercase tracking-widest mt-0.5"
          >
            {{ t("profile.memberSince", { date: memberSinceDate }) }}
          </div>
        </div>

        <!-- Edit name inline -->
        <div v-else class="flex flex-col items-center gap-3 w-full max-w-xs">
          <input
            v-model="editedName"
            class="w-full bg-bg-2 border border-overlay-2 rounded-xl px-4 py-2.5 text-center text-fg-0 text-[16px] font-display font-bold tracking-tight focus:outline-none focus:border-arcane/60"
            @keydown.enter="saveEdit"
          />
          <button
            class="flex items-center gap-1.5 bg-arcane/14 border border-arcane/30 text-arcane-2 font-semibold text-body-sm px-4 py-1.75 rounded-full cursor-pointer disabled:opacity-50"
            :disabled="isSaving"
            @click="saveEdit"
          >
            <SbIcon name="check" :size="13" :stroke="2.2" />
            {{ isSaving ? t("common.saving") : t("common.save") }}
          </button>
        </div>
      </div>

      <!-- Stat grid -->
      <div class="px-5 mb-8">
        <div class="text-[10px] text-fg-3 uppercase tracking-widest font-semibold mb-3">{{ t("profile.statsTitle") }}</div>
        <div class="grid grid-cols-2 gap-3">
          <div class="card-surface p-4">
            <SbStat :value="profileStore.stats?.totalGames ?? '—'" :label="t('profile.totalGames')" accent="tide" />
          </div>
          <div class="card-surface p-4">
            <SbStat :value="profileStore.stats?.winRate ?? '—'" :suffix="profileStore.stats?.winRate != null ? '%' : ''" :label="t('profile.winRate')" accent="arcane" />
          </div>
          <div class="card-surface p-4">
            <SbStat :value="profileStore.stats?.totalWins ?? '—'" :label="t('profile.totalWins')" accent="gold" />
          </div>
          <div class="card-surface p-4">
            <SbStat :value="profileStore.stats?.avgPlacement != null ? profileStore.stats.avgPlacement.toFixed(1) : '—'" :label="t('profile.avgPlace')" />
          </div>
        </div>
      </div>

      <!-- Decks piloted section -->
      <div class="px-5 mb-8">
        <div class="text-[10px] text-fg-3 uppercase tracking-widest font-semibold mb-3">
          {{ t("profile.decksPiloted") }}
          <span v-if="profileStore.deckStats" class="normal-case ml-1.5 text-fg-4 font-normal">
            {{ profileStore.deckStats.length }}
          </span>
        </div>

        <div v-if="profileStore.deckStatsLoading" class="flex flex-col gap-2">
          <div v-for="n in 3" :key="n" class="h-14 rounded-xl bg-bg-1 animate-pulse" />
        </div>

        <div
          v-else-if="profileStore.deckStatsError"
          class="py-4 text-center text-danger text-body-sm"
        >
          {{ profileStore.deckStatsError }}
        </div>

        <div
          v-else-if="!profileStore.deckStats?.length"
          class="py-4 text-center text-fg-3 text-body-sm"
        >
          {{ t("profile.noGames") }}
        </div>

        <div v-else class="card-surface overflow-hidden divide-y divide-divider-soft">
          <div
            v-for="d in profileStore.deckStats"
            :key="d.deckId"
            class="flex items-center gap-3 px-4 py-3"
          >
            <div class="flex-1 min-w-0">
              <div class="font-display font-bold text-body-lg tracking-tight text-fg-0 truncate leading-tight">
                {{ d.deckName }}
              </div>
              <div v-if="d.commander" class="text-caption italic text-fg-2 truncate mt-0.5">
                {{ d.commander }}
              </div>
            </div>

            <div class="shrink-0 flex flex-col items-end gap-0.5">
              <span class="font-display font-bold text-[17px] tracking-tight tabular-nums text-crown">
                {{ d.winrate }}%
              </span>
              <div class="font-mono text-meta text-fg-3">
                {{ t("profile.deckRecord", { wins: d.wins, games: d.games }) }}
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- Bottom nav -->
    <SbBottomNav active="you" @change="onNav" />

    <!-- Delete account confirmation -->
    <div
      v-if="showDeleteModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
      @click.self="showDeleteModal = false"
    >
      <div class="w-full max-w-sm bg-bg-1 border border-overlay-2 rounded-2xl p-5 flex flex-col gap-3">
        <h2 class="font-display font-bold text-fg-0 text-stat tracking-tight">{{ t("profile.delete.title") }}</h2>
        <p class="text-body-sm text-fg-2 leading-relaxed">
          {{ t("profile.delete.body") }}
        </p>
        <p class="text-caption text-fg-3">
          <i18n-t keypath="profile.delete.confirmPrompt" tag="span">
            <template #keyword>
              <span class="font-mono font-semibold text-fg-1">DELETE</span>
            </template>
          </i18n-t>
        </p>
        <input
          v-model="deleteConfirmText"
          type="text"
          placeholder="DELETE"
          autocomplete="off"
          autocapitalize="characters"
          class="h-11 rounded-xl bg-bg-2 border border-white/12 px-4 text-body text-fg-0 placeholder:text-fg-3 focus:outline-none focus:border-red-500/60 transition-colors"
          @keydown.enter="deleteAccount"
        />
        <p v-if="deleteError" class="text-caption text-red-400">{{ deleteError }}</p>
        <div class="flex gap-2.5 mt-1">
          <button
            class="flex-1 h-11 rounded-xl bg-bg-2 border border-white/12 text-fg-1 font-semibold text-body-sm hover:bg-bg-3 transition-colors cursor-pointer disabled:opacity-50"
            :disabled="deleteBusy"
            @click="showDeleteModal = false"
          >
            {{ t("common.cancel") }}
          </button>
          <button
            class="flex-1 h-11 rounded-xl bg-red-500 text-white font-semibold text-body-sm transition-opacity disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            :disabled="deleteBusy || deleteConfirmText !== 'DELETE'"
            @click="deleteAccount"
          >
            {{ deleteBusy ? t("profile.delete.deleting") : t("common.delete") }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
