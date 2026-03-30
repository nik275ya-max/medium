<script setup lang="ts">
import { ref } from 'vue';
import LicenseModal from './components/LicenseModal.vue';
import { checkLicense } from './services/license';

console.log('[App] Module loaded, checking license immediately...');

// Проверяем лицензию СРАЗУ, до первого рендера
const initialStatus = checkLicense();
console.log('[App] Initial license status:', initialStatus);
const isLicenseValid = ref(initialStatus.valid);
console.log('[App] isLicenseValid:', isLicenseValid.value);

const handleActivated = () => {
  console.log('[App] License activated event received!');
  isLicenseValid.value = true;
};
</script>

<template>
  <LicenseModal v-if="!isLicenseValid" @activated="handleActivated" />
  <router-view v-if="isLicenseValid" />
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

#app {
  min-height: 100vh;
}
</style>
