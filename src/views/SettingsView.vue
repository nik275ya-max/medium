<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { storageService } from '../services/storage';
import { VOICE_OPTIONS } from '../services/elevenlabs';
import type { Settings } from '../types';

const router = useRouter();
const settings = ref<Settings>({
  systemPrompt: '',
  selectedVoice: 'voice1',
  polzaApiKey: '',
  elevenlabsApiKey: '',
  temperature: 0.7,
});

const savedMessage = ref<string>('');

const voiceOptions = Object.entries(VOICE_OPTIONS).map(([key, value]) => ({
  value: key,
  label: value.name,
}));

onMounted(() => {
  settings.value = storageService.getSettings();
});

const saveSettings = () => {
  storageService.saveSettings(settings.value);
  savedMessage.value = 'Настройки сохранены';
  setTimeout(() => {
    savedMessage.value = '';
  }, 3000);
};

const goBack = () => {
  router.push('/');
};
</script>

<template>
  <div class="settings-view">
    <div class="header">
      <button class="back-button" @click="goBack">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
      </button>
      <h1 class="title">Настройки</h1>
    </div>

    <div class="content">
      <div class="form-group">
        <label class="label">Системный промпт</label>
        <textarea
          v-model="settings.systemPrompt"
          class="textarea"
          rows="6"
          placeholder="Описание личности ассистента..."
        ></textarea>
      </div>

      <div class="form-group">
        <label class="label">Голос</label>
        <select v-model="settings.selectedVoice" class="select">
          <option
            v-for="option in voiceOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
      </div>

      <div class="form-group">
        <label class="label">API ключ Polza.ai</label>
        <input
          v-model="settings.polzaApiKey"
          type="password"
          class="input"
          placeholder="sk-..."
        />
      </div>

      <div class="form-group">
        <label class="label">API ключ ElevenLabs</label>
        <input
          v-model="settings.elevenlabsApiKey"
          type="password"
          class="input"
          placeholder="Введите API ключ..."
        />
      </div>

      <div class="form-group">
        <label class="label">
          Температура ({{ settings.temperature.toFixed(1) }})
        </label>
        <input
          v-model.number="settings.temperature"
          type="range"
          min="0"
          max="1"
          step="0.1"
          class="slider"
        />
        <div class="slider-labels">
          <span>Точнее</span>
          <span>Креативнее</span>
        </div>
      </div>

      <button class="save-button" @click="saveSettings">
        Сохранить настройки
      </button>

      <div v-if="savedMessage" class="success-message">
        {{ savedMessage }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-view {
  min-height: 100vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  padding: 2rem 1rem;
}

.header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}

.back-button {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 2px solid #4a5568;
  background: rgba(45, 55, 72, 0.9);
  color: #e6e6fa;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.back-button:hover {
  transform: translateX(-4px);
  border-color: #9f7aea;
  box-shadow: 0 6px 24px rgba(159, 122, 234, 0.5);
}

.title {
  font-size: 2rem;
  font-weight: 300;
  color: #e6e6fa;
  margin: 0;
  font-family: 'Georgia', serif;
  letter-spacing: 0.1em;
}

.content {
  max-width: 600px;
  margin: 0 auto;
}

.form-group {
  margin-bottom: 2rem;
}

.label {
  display: block;
  color: #e6e6fa;
  font-size: 0.95rem;
  margin-bottom: 0.75rem;
  letter-spacing: 0.05em;
}

.textarea,
.input,
.select {
  width: 100%;
  padding: 1rem;
  background: rgba(45, 55, 72, 0.6);
  border: 2px solid #4a5568;
  border-radius: 8px;
  color: #e6e6fa;
  font-size: 1rem;
  font-family: inherit;
  transition: all 0.3s ease;
  box-sizing: border-box;
}

.textarea {
  resize: vertical;
  min-height: 120px;
  line-height: 1.5;
}

.textarea:focus,
.input:focus,
.select:focus {
  outline: none;
  border-color: #9f7aea;
  box-shadow: 0 0 0 3px rgba(159, 122, 234, 0.2);
}

.select {
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23e6e6fa' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 20px;
  padding-right: 3rem;
}

.slider {
  width: 100%;
  height: 6px;
  background: rgba(45, 55, 72, 0.6);
  border-radius: 3px;
  outline: none;
  -webkit-appearance: none;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  background: #9f7aea;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s ease;
}

.slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
  box-shadow: 0 0 0 8px rgba(159, 122, 234, 0.2);
}

.slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  background: #9f7aea;
  border-radius: 50%;
  cursor: pointer;
  border: none;
  transition: all 0.3s ease;
}

.slider::-moz-range-thumb:hover {
  transform: scale(1.2);
  box-shadow: 0 0 0 8px rgba(159, 122, 234, 0.2);
}

.slider-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 0.5rem;
  color: #9999b3;
  font-size: 0.85rem;
}

.save-button {
  width: 100%;
  padding: 1rem;
  background: linear-gradient(135deg, #9f7aea 0%, #7c3aed 100%);
  border: none;
  border-radius: 8px;
  color: #ffffff;
  font-size: 1.1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  letter-spacing: 0.05em;
}

.save-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(159, 122, 234, 0.4);
}

.save-button:active {
  transform: translateY(0);
}

.success-message {
  margin-top: 1.5rem;
  padding: 1rem 1.5rem;
  background: rgba(154, 230, 180, 0.1);
  border: 1px solid #68d391;
  border-radius: 8px;
  color: #68d391;
  text-align: center;
}

@media (max-width: 640px) {
  .settings-view {
    padding: 1rem;
  }

  .title {
    font-size: 1.75rem;
  }

  .back-button {
    width: 40px;
    height: 40px;
  }
}
</style>
