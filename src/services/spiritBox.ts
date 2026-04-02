/**
 * SpiritBoxService - Генератор звуков "поиска радиоволны" для Элизы
 * Воспроизводит реалистичные звуки настройки радио во время "связи с духом"
 */

export class SpiritBoxService {
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private isPlaying: boolean = false;
  private noiseSource: AudioBufferSourceNode | null = null;
  private tuner: OscillatorNode | null = null;
  private tunerGain: GainNode | null = null;

  /**
   * Инициализация аудио контекста (вызывать при первом клике пользователя)
   */
  init(): void {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    // Resume если suspended (требование браузеров)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().then(() => {
        console.log('[SpiritBox] Audio context resumed');
      });
    }
  }

  /**
   * Запуск звуков "поиска радиоволны"
   */
  async start(): Promise<void> {
    if (this.isPlaying) return;
    
    this.init();
    if (!this.audioContext) {
      console.error('[SpiritBox] Audio context not initialized');
      return;
    }

    this.isPlaying = true;
    this.gainNode = this.audioContext.createGain();
    this.gainNode.connect(this.audioContext.destination);
    
    // === Белый шум (основа) ===
    const bufferSize = 2 * this.audioContext.sampleRate;
    const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    this.noiseSource = this.audioContext.createBufferSource();
    this.noiseSource.buffer = noiseBuffer;
    this.noiseSource.loop = true;
    
    // === Фильтры для эффекта радио ===
    const bandpassFilter = this.audioContext.createBiquadFilter();
    bandpassFilter.type = 'bandpass';
    bandpassFilter.frequency.value = 1000;
    bandpassFilter.Q.value = 3;
    
    const highpassFilter = this.audioContext.createBiquadFilter();
    highpassFilter.type = 'highpass';
    highpassFilter.frequency.value = 300;
    
    // === "Настройка" радио (плавающее изменение частоты) ===
    this.tuner = this.audioContext.createOscillator();
    this.tuner.type = 'sine';
    this.tuner.frequency.value = 0.2; // Очень медленная модуляция
    
    this.tunerGain = this.audioContext.createGain();
    this.tunerGain.gain.value = 600; // Диапазон "настройки"
    
    this.tuner.connect(this.tunerGain);
    this.tunerGain.connect(bandpassFilter.frequency);
    
    // === Соединение ===
    this.noiseSource.connect(bandpassFilter);
    bandpassFilter.connect(highpassFilter);
    highpassFilter.connect(this.gainNode);
    
    // === Запуск ===
    this.noiseSource.start();
    this.tuner.start();
    
    // === Быстрое нарастание (0.3 сек) ===
    this.gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    this.gainNode.gain.linearRampToValueAtTime(0.2, this.audioContext.currentTime + 0.3);
    
    console.log('[SpiritBox] Radio tuning sound started');
  }

  /**
   * Остановка звуков "поиска радиоволны"
   */
  async stop(): Promise<void> {
    if (!this.isPlaying || !this.audioContext || !this.gainNode) return;
    
    // Быстрое затухание (0.2 сек)
    this.gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.2);
    
    // Остановка осциллятора
    if (this.tuner) {
      try { this.tuner.stop(); } catch(e) {}
      this.tuner = null;
    }
    
    // Остановка шума через 0.3 секунды
    setTimeout(() => {
      if (this.noiseSource) {
        try { this.noiseSource.stop(); } catch(e) {}
        this.noiseSource = null;
      }
      if (this.gainNode) {
        this.gainNode.disconnect();
        this.gainNode = null;
      }
      this.isPlaying = false;
      console.log('[SpiritBox] Radio tuning sound stopped');
    }, 300);
  }

  /**
   * Продолжение звука на 1 секунду после ответа
   */
  async continueAfterResponse(): Promise<void> {
    if (!this.isPlaying) {
      // Если звук был остановлен, запускаем снова на 1 секунду
      await this.start();
      setTimeout(async () => {
        await this.stop();
      }, 1000);
    }
  }

  /**
   * Проверка состояния
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }
}
