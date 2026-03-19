<script setup lang="ts">
import { ref, onMounted } from 'vue';
import LicenseModal from './components/LicenseModal.vue';
import { checkLicense } from './services/license';

const isLicenseValid = ref(false);

onMounted(() => {
  const status = checkLicense();
  isLicenseValid.value = status.valid;
});

const handleActivated = () => {
  isLicenseValid.value = true;
};
</script>

<template>
  <LicenseModal v-if="!isLicenseValid" @activated="handleActivated" />
  <router-view v-show="isLicenseValid" />
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
