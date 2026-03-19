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
      <div class="ornament ornament-top">
        <svg viewBox="0 0 200 40" xmlns="http://www.w3.org/2000/svg">
          <path d="M100 0 C60 0 40 20 20 20 C10 20 0 15 0 20 C0 25 10 20 20 20 C40 20 60 40 100 40 C140 40 160 20 180 20 C190 20 200 25 200 20 C200 15 190 20 180 20 C160 20 140 0 100 0 Z" fill="currentColor"/>
        </svg>
      </div>
      <h1 class="title">Элиза</h1>
      <p class="subtitle">Дух медиума</p>
      <div class="ornament ornament-bottom">
        <svg viewBox="0 0 200 40" xmlns="http://www.w3.org/2000/svg">
          <path d="M100 40 C60 40 40 20 20 20 C10 20 0 25 0 20 C0 15 10 20 20 20 C40 20 60 0 100 0 C140 0 160 20 180 20 C190 20 200 15 200 20 C200 25 190 20 180 20 C160 20 140 40 100 40 Z" fill="currentColor"/>
        </svg>
      </div>
    </div>

    <div class="content">
      <div class="circle-decoration"></div>
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
  overflow: hidden;
}

.main-view::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(159, 122, 234, 0.03) 0%, transparent 70%);
  animation: shimmer 15s linear infinite;
  pointer-events: none;
}

@keyframes shimmer {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.header {
  text-align: center;
  margin-top: 2rem;
  position: relative;
  z-index: 1;
}

.ornament {
  color: #9f7aea;
  opacity: 0.6;
  margin: 0.5rem 0;
}

.ornament-top {
  margin-bottom: 0.5rem;
}

.ornament-bottom {
  margin-top: 0.5rem;
  transform: scaleX(-1);
}

.ornament svg {
  width: 180px;
  height: 30px;
}

.title {
  font-size: 3rem;
  font-weight: 300;
  color: #e6e6fa;
  margin: 0.5rem 0;
  text-shadow: 0 0 20px rgba(230, 230, 250, 0.5);
  font-family: 'Georgia', serif;
  letter-spacing: 0.15em;
  position: relative;
}

.title::before,
.title::after {
  content: '✦';
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  color: #9f7aea;
  font-size: 1.2rem;
  opacity: 0.7;
}

.title::before {
  left: -2rem;
}

.title::after {
  right: -2rem;
}

.subtitle {
  font-size: 0.95rem;
  color: #9999b3;
  margin-top: 0.75rem;
  font-style: italic;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: 400px;
  position: relative;
  z-index: 1;
}

.circle-decoration {
  position: absolute;
  width: 340px;
  height: 340px;
  border: 1px solid rgba(159, 122, 234, 0.2);
  border-radius: 50%;
  pointer-events: none;
}

.circle-decoration::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 360px;
  height: 360px;
  border: 1px solid rgba(159, 122, 234, 0.1);
  border-radius: 50%;
}

.circle-decoration::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 380px;
  height: 380px;
  border: 1px solid rgba(159, 122, 234, 0.05);
  border-radius: 50%;
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

.voice-button::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(159, 122, 234, 0.1) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.voice-button:hover:not(:disabled)::before {
  opacity: 1;
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
  z-index: 100;
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

  .title::before,
  .title::after {
    display: none;
  }

  .voice-button {
    width: 240px;
    height: 240px;
    font-size: 1.25rem;
  }

  .circle-decoration {
    width: 300px;
    height: 300px;
  }

  .circle-decoration::before {
    width: 320px;
    height: 320px;
  }

  .circle-decoration::after {
    width: 340px;
    height: 340px;
  }

  .settings-button {
    bottom: 1.5rem;
    right: 1.5rem;
    width: 48px;
    height: 48px;
  }

  .ornament svg {
    width: 140px;
    height: 24px;
  }
}
</style>
