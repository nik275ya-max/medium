<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { AudioRecorder } from '../services/audioRecorder';
import { PolzaAIService } from '../services/polzaAI';
import { PolzaTTSService } from '../services/polzaTTS';
import { storageService } from '../services/storage';
import type { AppState } from '../types';

const router = useRouter();
const state = ref<AppState>('idle');
const errorMessage = ref<string>('');

const audioRecorder = new AudioRecorder();
const polzaAI = new PolzaAIService();
const polzaTTS = new PolzaTTSService();

onMounted(() => {
  const settings = storageService.getSettings();
  polzaAI.setApiKey(settings.polzaApiKey);
  polzaAI.initializeWithSystemPrompt(settings.systemPrompt);
  polzaTTS.setApiKey(settings.polzaApiKey);
});

const handleButtonClick = async () => {
  if (state.value === 'listening') {
    await stopListening();
  } else if (state.value === 'idle') {
    await startListening();
  }
};

const startListening = async () => {
  try {
    errorMessage.value = '';
    state.value = 'listening';
    await audioRecorder.startRecording();
  } catch (error) {
    errorMessage.value = (error as Error).message;
    state.value = 'idle';
  }
};

const stopListening = async () => {
  try {
    state.value = 'processing';
    const audioBlob = await audioRecorder.stopRecording();

    const transcription = await polzaAI.transcribeAudio(audioBlob);

    if (!transcription.trim()) {
      errorMessage.value = 'Не удалось распознать речь';
      state.value = 'idle';
      return;
    }

    const settings = storageService.getSettings();
    const response = await polzaAI.generateResponse(transcription, settings.temperature);

    state.value = 'speaking';
    const audioBuffer = await polzaTTS.synthesizeSpeech(response, settings.selectedVoice);
    await polzaTTS.playAudio(audioBuffer);

    state.value = 'idle';
  } catch (error) {
    errorMessage.value = (error as Error).message;
    state.value = 'idle';
  }
};

const goToSettings = () => {
  router.push('/settings');
};

const getButtonText = () => {
  switch (state.value) {
    case 'listening':
      return 'Слушаю';
    case 'processing':
      return 'Думаю';
    case 'speaking':
      return 'Отвечаю';
    default:
      return 'Нажмите для общения';
  }
};
</script>

<template>
  <div class="main-view">
    <div class="header">
      <h1 class="title">Элиза</h1>
      <p class="subtitle">Дух медиума викторианской эпохи</p>
    </div>

    <div class="content">
      <button
        class="voice-button"
        :class="[`state-${state}`]"
        @click="handleButtonClick"
        :disabled="state === 'processing' || state === 'speaking'"
      >
        <span class="button-text">{{ getButtonText() }}</span>
      </button>

      <div v-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>
    </div>

    <button class="settings-button" @click="goToSettings">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M12 1v6m0 6v6m-5.2-3.8L3 12l3.8-3.8m10.4 0L21 12l-3.8 3.8"></path>
      </svg>
    </button>
  </div>
</template>

<style scoped>
.main-view {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 2rem 1rem;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  position: relative;
}

.header {
  text-align: center;
  margin-top: 2rem;
}

.title {
  font-size: 3rem;
  font-weight: 300;
  color: #e6e6fa;
  margin: 0;
  text-shadow: 0 0 20px rgba(230, 230, 250, 0.5);
  font-family: 'Georgia', serif;
  letter-spacing: 0.1em;
}

.subtitle {
  font-size: 1rem;
  color: #9999b3;
  margin-top: 0.5rem;
  font-style: italic;
  letter-spacing: 0.05em;
}

.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: 400px;
}

.voice-button {
  width: 280px;
  height: 280px;
  border-radius: 50%;
  border: 3px solid #4a5568;
  background: radial-gradient(circle, #2d3748 0%, #1a202c 100%);
  color: #e6e6fa;
  font-size: 1.5rem;
  font-weight: 300;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  position: relative;
  overflow: hidden;
}

.voice-button:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.7);
}

.voice-button:disabled {
  cursor: not-allowed;
  opacity: 0.8;
}

.voice-button.state-listening {
  border-color: #48bb78;
  background: radial-gradient(circle, #276749 0%, #1a202c 100%);
  box-shadow: 0 8px 32px rgba(72, 187, 120, 0.4);
}

.voice-button.state-processing {
  border-color: #ecc94b;
  background: radial-gradient(circle, #744210 0%, #1a202c 100%);
}

.voice-button.state-speaking {
  border-color: #9f7aea;
  background: radial-gradient(circle, #553c9a 0%, #1a202c 100%);
  animation: pulse 1.5s ease-in-out infinite;
  box-shadow: 0 8px 32px rgba(159, 122, 234, 0.5);
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.08);
  }
}

.button-text {
  position: relative;
  z-index: 1;
  letter-spacing: 0.05em;
}

.error-message {
  margin-top: 2rem;
  padding: 1rem 1.5rem;
  background: rgba(254, 178, 178, 0.1);
  border: 1px solid #fc8181;
  border-radius: 8px;
  color: #fc8181;
  text-align: center;
  max-width: 300px;
}

.settings-button {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: 2px solid #4a5568;
  background: rgba(45, 55, 72, 0.9);
  color: #e6e6fa;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(10px);
}

.settings-button:hover {
  transform: rotate(90deg) scale(1.1);
  border-color: #9f7aea;
  box-shadow: 0 6px 24px rgba(159, 122, 234, 0.5);
}

@media (max-width: 640px) {
  .title {
    font-size: 2.5rem;
  }

  .voice-button {
    width: 240px;
    height: 240px;
    font-size: 1.25rem;
  }

  .settings-button {
    bottom: 1.5rem;
    right: 1.5rem;
    width: 48px;
    height: 48px;
  }
}
</style>
