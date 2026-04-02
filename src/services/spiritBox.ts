/**
 * SpiritBoxService - Генератор "белого шума" с эффектами для Элизы
 * Воспроизводит атмосферные звуки во время "связи с духом"
 */

export class SpiritBoxService {
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private isPlaying: boolean = false;

  /**
   * Инициализация аудио контекста
   */
  init(): void {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  /**
   * Запуск "белого шума" с эффектами
   */
  async start(): Promise<void> {
    if (this.isPlaying) return;
    
    this.init();
    if (!this.audioContext || !this.audioContext) {
      console.error('[SpiritBox] Audio context not initialized');
      return;
    }

    this.isPlaying = true;
    this.gainNode = this.audioContext.createGain();
    this.gainNode.connect(this.audioContext.destination);
    
    // Создаём белый шум
    const bufferSize = 2 * this.audioContext.sampleRate;
    const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      // Белый шум с модуляцией
      output[i] = Math.random() * 2 - 1;
    }

    const noiseSource = this.audioContext.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;
    
    // Фильтры для создания "призрачного" звука
    const filter1 = this.audioContext.createBiquadFilter();
    filter1.type = 'bandpass';
    filter1.frequency.value = 1000;
    filter1.Q.value = 1;
    
    const filter2 = this.audioContext.createBiquadFilter();
    filter2.type = 'lowpass';
    filter2.frequency.value = 3000;
    
    // LFO для модуляции (эффект "волн")
    const lfo = this.audioContext.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.5; // Медленная модуляция
    
    const lfoGain = this.audioContext.createGain();
    lfoGain.gain.value = 500;
    
    lfo.connect(lfoGain);
    lfoGain.connect(filter1.frequency);
    
    // Второй LFO для глитч-эффектов
    const glitchLfo = this.audioContext.createOscillator();
    glitchLfo.type = 'square';
    glitchLfo.frequency.value = 8; // Быстрая модуляция для глитчей
    
    const glitchGain = this.audioContext.createGain();
    glitchGain.gain.value = 0.3;
    
    glitchLfo.connect(glitchGain);
    glitchGain.connect(this.gainNode.gain);
    
    // Соединяем цепочку
    noiseSource.connect(filter1);
    filter1.connect(filter2);
    filter2.connect(this.gainNode);
    
    // Запуск
    noiseSource.start();
    lfo.start();
    glitchLfo.start();
    
    // Нарастание громкости (fade in)
    this.gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    this.gainNode.gain.linearRampToValueAtTime(0.15, this.audioContext.currentTime + 2);
    
    console.log('[SpiritBox] Spirit box started');
  }

  /**
   * Плавная остановка "белого шума"
   */
  async stop(): Promise<void> {
    if (!this.isPlaying || !this.audioContext || !this.gainNode) return;
    
    // Затухание (fade out)
    this.gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 1.5);
    
    // Остановка через 1.5 секунды
    setTimeout(() => {
      if (this.audioContext && this.gainNode) {
        this.gainNode.disconnect();
      }
      this.isPlaying = false;
      console.log('[SpiritBox] Spirit box stopped');
    }, 1500);
  }

  /**
   * Проверка состояния
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }
}
