/**
 * SpiritBoxService - Генератор звуков "поиска радиоволны" для Элизы
 * Реалистичные звуки настройки старого радио с помехами
 */

export class SpiritBoxService {
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private isPlaying: boolean = false;
  private noiseSource: AudioBufferSourceNode | null = null;
  private filterFreqOsc: OscillatorNode | null = null;
  private filterQOsc: OscillatorNode | null = null;

  /**
   * Инициализация аудио контекста
   */
  init(): void {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  /**
   * Запуск звуков "поиска радиоволны"
   */
  async start(): Promise<void> {
    if (this.isPlaying) return;
    
    this.init();
    if (!this.audioContext) return;

    this.isPlaying = true;
    
    // === Основная цепочка ===
    this.gainNode = this.audioContext.createGain();
    this.gainNode.connect(this.audioContext.destination);
    
    // === Розовый шум (более приятный чем белый) ===
    const bufferSize = 2 * this.audioContext.sampleRate;
    const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    
    // Генерация розового шума (1/f шум)
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      output[i] *= 0.11; // Компенсация громкости
      b6 = white * 0.115926;
    }

    this.noiseSource = this.audioContext.createBufferSource();
    this.noiseSource.buffer = noiseBuffer;
    this.noiseSource.loop = true;
    
    // === Полосовой фильтр с плавающей частотой (эффект настройки) ===
    const bandpassFilter = this.audioContext.createBiquadFilter();
    bandpassFilter.type = 'bandpass';
    bandpassFilter.frequency.value = 800;
    bandpassFilter.Q.value = 2;
    
    // === Плавающая частота (как будто кто-то крутит ручку) ===
    this.filterFreqOsc = this.audioContext.createOscillator();
    this.filterFreqOsc.type = 'sine';
    this.filterFreqOsc.frequency.value = 0.15; // Медленное движение
    
    const freqGain = this.audioContext.createGain();
    freqGain.gain.value = 500; // Диапазон частот 300-1300 Hz
    
    this.filterFreqOsc.connect(freqGain);
    freqGain.connect(bandpassFilter.frequency);
    
    // === Плавающая добротность (резкость настройки) ===
    this.filterQOsc = this.audioContext.createOscillator();
    this.filterQOsc.type = 'triangle';
    this.filterQOsc.frequency.value = 0.08; // Ещё медленнее
    
    const qGain = this.audioContext.createGain();
    qGain.gain.value = 1.5; // Q от 0.5 до 3.5
    
    this.filterQOsc.connect(qGain);
    qGain.connect(bandpassFilter.Q);
    
    // === Дополнительный highpass для реализма ===
    const highpassFilter = this.audioContext.createBiquadFilter();
    highpassFilter.type = 'highpass';
    highpassFilter.frequency.value = 200;
    
    // === Соединение ===
    this.noiseSource.connect(bandpassFilter);
    bandpassFilter.connect(highpassFilter);
    highpassFilter.connect(this.gainNode);
    
    // === Запуск ===
    this.noiseSource.start();
    this.filterFreqOsc.start();
    this.filterQOsc.start();
    
    // === Плавное нарастание (0.2 сек) ===
    this.gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    this.gainNode.gain.linearRampToValueAtTime(0.18, this.audioContext.currentTime + 0.2);
    
    console.log('[SpiritBox] Radio tuning started');
  }

  /**
   * Остановка звуков
   */
  async stop(): Promise<void> {
    if (!this.isPlaying || !this.audioContext || !this.gainNode) return;
    
    // Быстрое затухание (0.15 сек)
    this.gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.15);
    
    // Остановка осцилляторов
    if (this.filterFreqOsc) {
      try { this.filterFreqOsc.stop(); } catch(e) {}
      this.filterFreqOsc = null;
    }
    if (this.filterQOsc) {
      try { this.filterQOsc.stop(); } catch(e) {}
      this.filterQOsc = null;
    }
    
    // Остановка шума через 0.2 секунды
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
      console.log('[SpiritBox] Radio tuning stopped');
    }, 200);
  }

  /**
   * Проверка состояния
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }
}
