<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { AudioRecorder } from '../services/audioRecorder';
import { PolzaAIService } from '../services/polzaAI';
import { PolzaTTSService } from '../services/polzaTTS';
import { SpiritBoxService } from '../services/spiritBox';
import { storageService, DEFAULT_POLZA_KEY } from '../services/storage';
import type { AppState } from '../types';

const router = useRouter();
const state = ref<AppState>('idle');
const errorMessage = ref<string>('');

const audioRecorder = new AudioRecorder();
const polzaAI = new PolzaAIService();
const polzaTTS = new PolzaTTSService();
const spiritBox = new SpiritBoxService();

const currentSettings = ref(storageService.getSettings());

onMounted(async () => {
  const settings = storageService.getSettings();
  currentSettings.value = settings;
  
  polzaAI.setApiKey(settings.polzaApiKey || DEFAULT_POLZA_KEY);
  polzaAI.initializeWithSystemPrompt(settings.systemPrompt);
  polzaTTS.setApiKey(settings.polzaApiKey || DEFAULT_POLZA_KEY);
  
  // Загрузка аудиофайла в зависимости от настроек
  const audioFile = settings.soundMode === 'radio' ? '/radio-tuning.mp3' : '/ghost-sounds.mp3';
  await spiritBox.loadAudioFile(audioFile);
});

// Следим за изменением режима звука и перезагружаем файл
watch(
  () => storageService.getSettings().soundMode,
  async (newMode) => {
    const audioFile = newMode === 'radio' ? '/radio-tuning.mp3' : '/ghost-sounds.mp3';
    await spiritBox.reloadAudioFile(audioFile);
  }
);

const handleButtonClick = async () => {
  spiritBox.init();
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
    await spiritBox.start();
    
    const audioBlob = await audioRecorder.stopRecording();
    const transcription = await polzaAI.transcribeAudio(audioBlob);

    if (!transcription.trim()) {
      errorMessage.value = 'Не удалось распознать речь';
      state.value = 'idle';
      await spiritBox.stop();
      return;
    }

    const settings = storageService.getSettings();
    const response = await polzaAI.generateResponse(transcription, settings.temperature);

    state.value = 'speaking';
    
    try {
      const audioBuffer = await polzaTTS.synthesizeSpeech(response, settings.selectedVoice);
      await spiritBox.duck(); // Приглушаем фон перед ответом
      await polzaTTS.playAudio(audioBuffer);
      await spiritBox.stop(); // Останавливаем звуки после ответа
    } catch (audioError) {
      console.error('Audio playback error:', audioError);
      await spiritBox.stop();
    }

    state.value = 'idle';
  } catch (error) {
    errorMessage.value = (error as Error).message;
    state.value = 'idle';
    await spiritBox.stop();
  }
};

const goToSettings = () => {
  router.push('/settings');
};

const getButtonText = () => {
  switch (state.value) {
    case 'listening': return 'Слушаю';
    case 'processing': return 'Связь...';
    case 'speaking': return 'Отвечаю';
    default: return 'Нажмите для общения';
  }
};
</script>

<template>
  <div class="main-view" :style="{ '--ui-scale': currentSettings.uiScale }">
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
  padding: calc(2rem * var(--ui-scale, 1)) calc(1rem * var(--ui-scale, 1));
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
  margin-top: calc(2rem * var(--ui-scale, 1));
  position: relative;
  z-index: 1;
}

.ornament {
  color: #9f7aea;
  opacity: 0.6;
  margin: calc(0.5rem * var(--ui-scale, 1)) 0;
}

.ornament-top { margin-bottom: calc(0.5rem * var(--ui-scale, 1)); }
.ornament-bottom { margin-top: calc(0.5rem * var(--ui-scale, 1)); transform: scaleX(-1); }
.ornament svg { width: calc(180px * var(--ui-scale, 1)); height: calc(30px * var(--ui-scale, 1)); }

.title {
  font-size: calc(3rem * var(--ui-scale, 1));
  font-weight: 300;
  color: #e6e6fa;
  margin: calc(0.5rem * var(--ui-scale, 1)) 0;
  text-shadow: 0 0 20px rgba(230, 230, 250, 0.5);
  font-family: 'Georgia', serif;
  letter-spacing: 0.15em;
  position: relative;
}

.title::before, .title::after {
  content: '✦';
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  color: #9f7aea;
  font-size: calc(1.2rem * var(--ui-scale, 1));
  opacity: 0.7;
}
.title::before { left: calc(-2rem * var(--ui-scale, 1)); }
.title::after { right: calc(-2rem * var(--ui-scale, 1)); }

.subtitle {
  font-size: calc(0.95rem * var(--ui-scale, 1));
  color: #9999b3;
  margin-top: calc(0.75rem * var(--ui-scale, 1));
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
  max-width: calc(400px * var(--ui-scale, 1));
  position: relative;
  z-index: 1;
}

.circle-decoration {
  position: absolute;
  width: calc(340px * var(--ui-scale, 1));
  height: calc(340px * var(--ui-scale, 1));
  border: 1px solid rgba(159, 122, 234, 0.2);
  border-radius: 50%;
  pointer-events: none;
}
.circle-decoration::before {
  content: '';
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: calc(360px * var(--ui-scale, 1)); height: calc(360px * var(--ui-scale, 1));
  border: 1px solid rgba(159, 122, 234, 0.1);
  border-radius: 50%;
}
.circle-decoration::after {
  content: '';
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: calc(380px * var(--ui-scale, 1)); height: calc(380px * var(--ui-scale, 1));
  border: 1px solid rgba(159, 122, 234, 0.05);
  border-radius: 50%;
}

.voice-button {
  width: calc(280px * var(--ui-scale, 1));
  height: calc(280px * var(--ui-scale, 1));
  border-radius: 50%;
  border: 3px solid #4a5568;
  background: radial-gradient(circle, #2d3748 0%, #1a202c 100%);
  color: #e6e6fa;
  font-size: calc(1.5rem * var(--ui-scale, 1));
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
  top: -50%; left: -50%;
  width: 200%; height: 200%;
  background: radial-gradient(circle, rgba(159, 122, 234, 0.1) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.3s ease;
}
.voice-button:hover:not(:disabled)::before { opacity: 1; }
.voice-button:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.7);
}
.voice-button:disabled { cursor: not-allowed; opacity: 0.8; }
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
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.08); }
}

.button-text { position: relative; z-index: 1; letter-spacing: 0.05em; }

.error-message {
  margin-top: calc(2rem * var(--ui-scale, 1));
  padding: calc(1rem * var(--ui-scale, 1)) calc(1.5rem * var(--ui-scale, 1));
  background: rgba(254, 178, 178, 0.1);
  border: 1px solid #fc8181;
  border-radius: 8px;
  color: #fc8181;
  text-align: center;
  max-width: calc(300px * var(--ui-scale, 1));
}

.settings-button {
  position: fixed;
  bottom: calc(2rem * var(--ui-scale, 1)); right: calc(2rem * var(--ui-scale, 1));
  width: calc(56px * var(--ui-scale, 1)); height: calc(56px * var(--ui-scale, 1));
  border-radius: 50%;
  border: 2px solid #4a5568;
  background: rgba(45, 55, 72, 0.9);
  color: #e6e6fa;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
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
  .title { font-size: calc(2.5rem * var(--ui-scale, 1)); }
  .title::before, .title::after { display: none; }
  .voice-button { width: calc(240px * var(--ui-scale, 1)); height: calc(240px * var(--ui-scale, 1)); font-size: calc(1.25rem * var(--ui-scale, 1)); }
  .circle-decoration { width: calc(300px * var(--ui-scale, 1)); height: calc(300px * var(--ui-scale, 1)); }
  .circle-decoration::before { width: calc(320px * var(--ui-scale, 1)); height: calc(320px * var(--ui-scale, 1)); }
  .circle-decoration::after { width: calc(340px * var(--ui-scale, 1)); height: calc(340px * var(--ui-scale, 1)); }
  .settings-button { bottom: calc(1.5rem * var(--ui-scale, 1)); right: calc(1.5rem * var(--ui-scale, 1)); width: calc(48px * var(--ui-scale, 1)); height: calc(48px * var(--ui-scale, 1)); }
  .ornament svg { width: calc(140px * var(--ui-scale, 1)); height: calc(24px * var(--ui-scale, 1)); }
}

.settings-button svg {
  width: calc(24px * var(--ui-scale, 1));
  height: calc(24px * var(--ui-scale, 1));
}
</style>
