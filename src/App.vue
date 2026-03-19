<script setup lang="ts">
import { ref, onMounted } from 'vue';
import LicenseModal from './components/LicenseModal.vue';
import { checkLicense } from './services/license';

const isLicenseValid = ref(false);

onMounted(() => {
  console.log('[App] Checking license...');
  const status = checkLicense();
  console.log('[App] License status:', status);
  isLicenseValid.value = status.valid;
});

const handleActivated = () => {
  console.log('[App] License activated!');
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
