/**
 * SpiritBoxService - Генератор звуков "поиска радиоволны" с dial-up модемом
 * Реалистичные звуки настройки радио + звуки модема
 */

export class SpiritBoxService {
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private isPlaying: boolean = false;
  private noiseSource: AudioBufferSourceNode | null = null;
  private filterFreqOsc: OscillatorNode | null = null;
  private filterQOsc: OscillatorNode | null = null;
  
  // Dial-up модем осцилляторы
  private modemOscillators: OscillatorNode[] = [];
  private modemGains: GainNode[] = [];

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
   * Запуск звуков "поиска радиоволны" + dial-up
   */
  async start(): Promise<void> {
    if (this.isPlaying) return;
    
    this.init();
    if (!this.audioContext) return;

    this.isPlaying = true;
    
    // === Основная цепочка ===
    this.gainNode = this.audioContext.createGain();
    this.gainNode.connect(this.audioContext.destination);
    
    // === Розовый шум (основа радио) ===
    const bufferSize = 2 * this.audioContext.sampleRate;
    const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    
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
      output[i] *= 0.11;
      b6 = white * 0.115926;
    }

    this.noiseSource = this.audioContext.createBufferSource();
    this.noiseSource.buffer = noiseBuffer;
    this.noiseSource.loop = true;
    
    // === Полосовой фильтр с плавающей частотой ===
    const bandpassFilter = this.audioContext.createBiquadFilter();
    bandpassFilter.type = 'bandpass';
    bandpassFilter.frequency.value = 800;
    bandpassFilter.Q.value = 2;
    
    // === Плавающая частота ===
    this.filterFreqOsc = this.audioContext.createOscillator();
    this.filterFreqOsc.type = 'sine';
    this.filterFreqOsc.frequency.value = 0.15;
    
    const freqGain = this.audioContext.createGain();
    freqGain.gain.value = 500;
    
    this.filterFreqOsc.connect(freqGain);
    freqGain.connect(bandpassFilter.frequency);
    
    // === Плавающая добротность ===
    this.filterQOsc = this.audioContext.createOscillator();
    this.filterQOsc.type = 'triangle';
    this.filterQOsc.frequency.value = 0.08;
    
    const qGain = this.audioContext.createGain();
    qGain.gain.value = 1.5;
    
    this.filterQOsc.connect(qGain);
    qGain.connect(bandpassFilter.Q);
    
    // === Highpass фильтр ===
    const highpassFilter = this.audioContext.createBiquadFilter();
    highpassFilter.type = 'highpass';
    highpassFilter.frequency.value = 200;
    
    // === Соединение ===
    this.noiseSource.connect(bandpassFilter);
    bandpassFilter.connect(highpassFilter);
    highpassFilter.connect(this.gainNode);
    
    // === Запуск шума ===
    this.noiseSource.start();
    this.filterFreqOsc.start();
    this.filterQOsc.start();
    
    // === Dial-up модем звуки ===
    this.startDialUpSounds();
    
    // === Плавное нарастание (0.2 сек) ===
    this.gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    this.gainNode.gain.linearRampToValueAtTime(0.15, this.audioContext.currentTime + 0.2);
    
    console.log('[SpiritBox] Radio tuning + dial-up started');
  }

  /**
   * Dial-up модем звуки
   */
  private startDialUpSounds(): void {
    if (!this.audioContext) return;
    
    const now = this.audioContext.currentTime;
    
    // === Тон 1100 Hz (начальный сигнал) ===
    this.playModemTone(1100, now, 0.3);
    
    // === Тон 2100 Hz (ответный сигнал) ===
    this.playModemTone(2100, now + 0.35, 0.2);
    
    // === Последовательность тонов (скрежет модема) ===
    const frequencies = [1650, 1850, 2200, 2400, 1200, 2600];
    frequencies.forEach((freq, index) => {
      const startTime = now + 0.6 + (index * 0.15);
      const duration = 0.12;
      this.playModemTone(freq, startTime, duration, 0.08);
    });
    
    // === Высокочастотный "скрежет" (V.34) ===
    this.playModemTone(3200, now + 1.5, 0.4, 0.05);
    this.playModemTone(3600, now + 1.5, 0.4, 0.05);
    
    // === Финальный "писк" ===
    this.playModemTone(4200, now + 2.0, 0.15, 0.06);
  }

  /**
   * Проигрывание одного тона модема
   */
  private playModemTone(
    frequency: number,
    startTime: number,
    duration: number,
    volume: number = 0.1
  ): void {
    if (!this.audioContext) return;
    
    const osc = this.audioContext.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = frequency;
    
    const gain = this.audioContext.createGain();
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.02);
    gain.gain.setValueAtTime(volume, startTime + duration - 0.02);
    gain.gain.linearRampToValueAtTime(0, startTime + duration);
    
    osc.connect(gain);
    gain.connect(this.audioContext.destination);
    
    osc.start(startTime);
    osc.stop(startTime + duration + 0.1);
    
    this.modemOscillators.push(osc);
    this.modemGains.push(gain);
  }

  /**
   * Остановка всех звуков
   */
  async stop(): Promise<void> {
    if (!this.isPlaying || !this.audioContext || !this.gainNode) return;
    
    // Быстрое затухание (0.15 сек)
    this.gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.15);
    
    // Остановка осцилляторов фильтра
    if (this.filterFreqOsc) {
      try { this.filterFreqOsc.stop(); } catch(e) {}
      this.filterFreqOsc = null;
    }
    if (this.filterQOsc) {
      try { this.filterQOsc.stop(); } catch(e) {}
      this.filterQOsc = null;
    }
    
    // Остановка модемных тонов
    this.modemOscillators.forEach(osc => {
      try { osc.stop(); } catch(e) {}
    });
    this.modemOscillators = [];
    this.modemGains = [];
    
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
      console.log('[SpiritBox] Radio tuning + dial-up stopped');
    }, 200);
  }

  /**
   * Проверка состояния
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }
}
