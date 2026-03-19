<script setup lang="ts">
import { ref, computed } from 'vue';
import { activateLicense, checkLicense, getLicenseStatus } from '../services/license';

const emit = defineEmits<{
  activated: [];
}>();

const licenseInput = ref('');
const licenseError = ref('');
const isActivating = ref(false);

const canActivate = computed(() => {
  return licenseInput.value.trim().length >= 22;
});

const activate = () => {
  if (!canActivate.value) return;

  isActivating.value = true;
  licenseError.value = '';

  const result = activateLicense(licenseInput.value);

  if (result.valid) {
    emit('activated');
  } else {
    licenseError.value = result.error || 'Ошибка активации';
  }

  isActivating.value = false;
};

// Проверка при загрузке компонента
const status = checkLicense();
if (status.valid) {
  emit('activated');
}
</script>

<template>
  <div class="license-modal-overlay">
    <div class="license-modal">
      <div class="modal-header">
        <h1 class="modal-title">ЭЛИЗА</h1>
        <p class="modal-subtitle">Дух медиума</p>
      </div>

      <div class="modal-content">
        <p class="modal-text">
          Для продолжения работы необходимо активировать лицензию.
        </p>

        <div class="form-group">
          <label class="label">Лицензионный ключ:</label>
          <input
            v-model="licenseInput"
            type="text"
            class="input"
            placeholder="ELIZA-YYYYMMDD-XXXX-XXXX"
            maxlength="26"
            :disabled="isActivating"
            autocomplete="off"
          />
          <small class="hint">Формат: ELIZA-YYYYMMDD-XXXX-XXXX</small>
        </div>

        <div v-if="licenseError" class="error-message">
          {{ licenseError }}
        </div>

        <button
          class="activate-button"
          :disabled="!canActivate || isActivating"
          @click="activate"
        >
          {{ isActivating ? 'Проверка...' : 'Активировать' }}
        </button>

        <p class="help-text">
          Лицензионный ключ был предоставлен вам после приобретения.
          Проверьте электронную почту или обратитесь в поддержку.
        </p>
      </div>

      <div class="modal-footer">
        <svg class="decorative-icon" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" stroke-width="1" opacity="0.3"/>
          <circle cx="50" cy="50" r="35" fill="none" stroke="currentColor" stroke-width="1" opacity="0.2"/>
          <path d="M50 20 L50 50 L70 60" fill="none" stroke="currentColor" stroke-width="2" opacity="0.5"/>
        </svg>
      </div>
    </div>
  </div>
</template>

<style scoped>
.license-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 1rem;
}

.license-modal {
  max-width: 480px;
  width: 100%;
  background: rgba(45, 55, 72, 0.5);
  border: 1px solid rgba(159, 122, 234, 0.3);
  border-radius: 16px;
  padding: 2.5rem 2rem;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.modal-header {
  text-align: center;
  margin-bottom: 2rem;
}

.modal-title {
  font-size: 2.5rem;
  font-weight: 300;
  color: #e6e6fa;
  margin: 0;
  font-family: 'Georgia', serif;
  letter-spacing: 0.2em;
}

.modal-subtitle {
  font-size: 0.9rem;
  color: #9999b3;
  margin-top: 0.5rem;
  font-style: italic;
  letter-spacing: 0.15em;
}

.modal-content {
  text-align: center;
}

.modal-text {
  color: #b8b8d0;
  font-size: 1rem;
  line-height: 1.6;
  margin-bottom: 1.5rem;
}

.form-group {
  margin-bottom: 1.5rem;
  text-align: left;
}

.label {
  display: block;
  color: #e6e6fa;
  font-size: 0.9rem;
  margin-bottom: 0.75rem;
  letter-spacing: 0.05em;
}

.input {
  width: 100%;
  padding: 1rem;
  background: rgba(45, 55, 72, 0.6);
  border: 2px solid #4a5568;
  border-radius: 8px;
  color: #e6e6fa;
  font-size: 1rem;
  font-family: monospace;
  letter-spacing: 0.05em;
  transition: all 0.3s ease;
  box-sizing: border-box;
}

.input:focus {
  outline: none;
  border-color: #9f7aea;
  box-shadow: 0 0 0 3px rgba(159, 122, 234, 0.2);
}

.input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.hint {
  display: block;
  color: #666680;
  font-size: 0.8rem;
  margin-top: 0.5rem;
}

.error-message {
  margin-bottom: 1rem;
  padding: 0.75rem 1rem;
  background: rgba(254, 178, 178, 0.1);
  border: 1px solid #fc8181;
  border-radius: 6px;
  color: #fc8181;
  font-size: 0.9rem;
}

.activate-button {
  width: 100%;
  padding: 1rem;
  background: linear-gradient(135deg, #9f7aea 0%, #7c3aed 100%);
  border: none;
  border-radius: 8px;
  color: #ffffff;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  letter-spacing: 0.05em;
}

.activate-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.activate-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(159, 122, 234, 0.4);
}

.help-text {
  margin-top: 1.5rem;
  color: #666680;
  font-size: 0.85rem;
  line-height: 1.5;
}

.modal-footer {
  margin-top: 2rem;
  text-align: center;
}

.decorative-icon {
  width: 60px;
  height: 60px;
  color: #9f7aea;
  opacity: 0.3;
}

@media (max-width: 640px) {
  .license-modal {
    padding: 2rem 1.5rem;
  }

  .modal-title {
    font-size: 2rem;
  }
}
</style>
