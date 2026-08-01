<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import LicenseModal from './components/LicenseModal.vue';
import { checkLicense } from './services/license';
import { storageService } from './services/storage';
import type { Settings } from './types';

const isLicenseValid = ref(false);
const uiScale = ref(storageService.getSettings().uiScale);

const appStyle = computed(() => ({
  '--ui-scale': uiScale.value,
}));

const handleSettingsUpdated = (event: Event) => {
  const settings = (event as CustomEvent<Settings>).detail;
  if (settings?.uiScale !== undefined) uiScale.value = settings.uiScale;
};

// Проверяем лицензию при монтировании
onMounted(async () => {
  window.addEventListener('eliza-settings-updated', handleSettingsUpdated);
  console.log('[App] Checking license...');
  const status = await checkLicense();
  console.log('[App] License status:', status);
  isLicenseValid.value = status.valid;
  console.log('[App] isLicenseValid:', isLicenseValid.value);
});

onBeforeUnmount(() => {
  window.removeEventListener('eliza-settings-updated', handleSettingsUpdated);
});

const handleActivated = () => {
  console.log('[App] License activated event received!');
  isLicenseValid.value = true;
};
</script>

<template>
  <div class="app-shell" :style="appStyle">
    <LicenseModal v-if="!isLicenseValid" @activated="handleActivated" />
    <router-view v-if="isLicenseValid" />
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  height: 100%;
  overflow-x: hidden;
}

.app-shell {
  min-height: 100vh;
}

#app {
  min-height: 100vh;
}
</style>
