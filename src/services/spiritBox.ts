/**
 * SpiritBoxService - Генератор "белого шума" с эффектами для Элизы
 * Воспроизводит атмосферные звуки во время "связи с духом"
 */

export class SpiritBoxService {
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private isPlaying: boolean = false;
  private noiseSource: AudioBufferSourceNode | null = null;
  private lfo: OscillatorNode | null = null;
  private glitchLfo: OscillatorNode | null = null;

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
   * Запуск "белого шума" с эффектами
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
    
    // Создаём белый шум
    const bufferSize = 2 * this.audioContext.sampleRate;
    const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      // Белый шум с модуляцией
      output[i] = Math.random() * 2 - 1;
    }

    this.noiseSource = this.audioContext.createBufferSource();
    this.noiseSource.buffer = noiseBuffer;
    this.noiseSource.loop = true;
    
    // Фильтры для создания "призрачного" звука
    const filter1 = this.audioContext.createBiquadFilter();
    filter1.type = 'bandpass';
    filter1.frequency.value = 800;
    filter1.Q.value = 2;
    
    const filter2 = this.audioContext.createBiquadFilter();
    filter2.type = 'lowpass';
    filter2.frequency.value = 2500;
    
    // LFO для модуляции (эффект "волн")
    this.lfo = this.audioContext.createOscillator();
    this.lfo.type = 'sine';
    this.lfo.frequency.value = 0.3; // Медленная модуляция
    
    const lfoGain = this.audioContext.createGain();
    lfoGain.gain.value = 400;
    
    this.lfo.connect(lfoGain);
    lfoGain.connect(filter1.frequency);
    
    // Второй LFO для глитч-эффектов
    this.glitchLfo = this.audioContext.createOscillator();
    this.glitchLfo.type = 'square';
    this.glitchLfo.frequency.value = 6; // Быстрая модуляция для глитчей
    
    const glitchGain = this.audioContext.createGain();
    glitchGain.gain.value = 0.2;
    
    this.glitchLfo.connect(glitchGain);
    glitchGain.connect(this.gainNode.gain);
    
    // Соединяем цепочку
    this.noiseSource.connect(filter1);
    filter1.connect(filter2);
    filter2.connect(this.gainNode);
    
    // Запуск
    this.noiseSource.start();
    this.lfo.start();
    this.glitchLfo.start();
    
    // Нарастание громкости (fade in) - более быстрое
    this.gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    this.gainNode.gain.linearRampToValueAtTime(0.25, this.audioContext.currentTime + 1);
    
    console.log('[SpiritBox] Spirit box started');
  }

  /**
   * Плавная остановка "белого шума"
   */
  async stop(): Promise<void> {
    if (!this.isPlaying || !this.audioContext || !this.gainNode) return;
    
    // Затухание (fade out)
    this.gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 1);
    
    // Остановка осцилляторов
    if (this.lfo) {
      try { this.lfo.stop(); } catch(e) {}
      this.lfo = null;
    }
    if (this.glitchLfo) {
      try { this.glitchLfo.stop(); } catch(e) {}
      this.glitchLfo = null;
    }
    
    // Остановка через 1 секунду
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
      console.log('[SpiritBox] Spirit box stopped');
    }, 1000);
  }

  /**
   * Проверка состояния
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }
}
