/**
 * SpiritBoxService - Генератор потусторонних звуков для Элизы
 * Обрывки слов, шёпот, голоса "с того света"
 */

export class SpiritBoxService {
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private isPlaying: boolean = false;
  private noiseSource: AudioBufferSourceNode | null = null;
  private filterFreqOsc: OscillatorNode | null = null;
  private filterQOsc: OscillatorNode | null = null;
  
  // Потусторонние голоса
  private voiceOscillators: OscillatorNode[] = [];
  private voiceGains: GainNode[] = [];

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
   * Запуск потусторонних звуков
   */
  async start(): Promise<void> {
    if (this.isPlaying) return;
    
    this.init();
    if (!this.audioContext) return;

    this.isPlaying = true;
    
    // === Основная цепочка ===
    this.gainNode = this.audioContext.createGain();
    this.gainNode.connect(this.audioContext.destination);
    
    // === Розовый шум (основа) ===
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
    bandpassFilter.frequency.value = 600;
    bandpassFilter.Q.value = 2;
    
    // === Плавающая частота (медленное движение) ===
    this.filterFreqOsc = this.audioContext.createOscillator();
    this.filterFreqOsc.type = 'sine';
    this.filterFreqOsc.frequency.value = 0.1;
    
    const freqGain = this.audioContext.createGain();
    freqGain.gain.value = 400;
    
    this.filterFreqOsc.connect(freqGain);
    freqGain.connect(bandpassFilter.frequency);
    
    // === Плавающая добротность ===
    this.filterQOsc = this.audioContext.createOscillator();
    this.filterQOsc.type = 'triangle';
    this.filterQOsc.frequency.value = 0.05;
    
    const qGain = this.audioContext.createGain();
    qGain.gain.value = 1.2;
    
    this.filterQOsc.connect(qGain);
    qGain.connect(bandpassFilter.Q);
    
    // === Highpass фильтр ===
    const highpassFilter = this.audioContext.createBiquadFilter();
    highpassFilter.type = 'highpass';
    highpassFilter.frequency.value = 150;
    
    // === Соединение ===
    this.noiseSource.connect(bandpassFilter);
    bandpassFilter.connect(highpassFilter);
    highpassFilter.connect(this.gainNode);
    
    // === Запуск шума ===
    this.noiseSource.start();
    this.filterFreqOsc.start();
    this.filterQOsc.start();
    
    // === Потусторонние голоса ===
    this.startGhostVoices();
    
    // === Плавное нарастание ===
    this.gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    this.gainNode.gain.linearRampToValueAtTime(0.2, this.audioContext.currentTime + 0.3);
    
    console.log('[SpiritBox] Ghost voices started');
  }

  /**
   * Потусторонние голоса и шёпот
   */
  private startGhostVoices(): void {
    if (!this.audioContext) return;
    
    const now = this.audioContext.currentTime;
    
    // === Низкий "шёпот" (80-150 Hz) ===
    this.playGhostVoice(100, now + 0.5, 1.5, 0.08);
    this.playGhostVoice(120, now + 2.5, 1.2, 0.07);
    this.playGhostVoice(90, now + 4.5, 1.8, 0.09);
    
    // === Средний "шёпот" (200-400 Hz) ===
    this.playGhostVoice(280, now + 1.0, 0.8, 0.06);
    this.playGhostVoice(350, now + 3.0, 1.0, 0.05);
    this.playGhostVoice(220, now + 5.0, 1.3, 0.07);
    
    // === Высокий "шёпот" (600-900 Hz) ===
    this.playGhostVoice(650, now + 1.5, 0.5, 0.04);
    this.playGhostVoice(800, now + 3.5, 0.6, 0.03);
    this.playGhostVoice(720, now + 5.5, 0.7, 0.05);
    
    // === "Обрывки слов" (быстрые всплески) ===
    this.playGhostVoice(450, now + 0.8, 0.15, 0.05);
    this.playGhostVoice(520, now + 1.3, 0.12, 0.04);
    this.playGhostVoice(380, now + 2.0, 0.18, 0.06);
    this.playGhostVoice(600, now + 2.8, 0.14, 0.04);
    this.playGhostVoice(490, now + 3.8, 0.16, 0.05);
    this.playGhostVoice(420, now + 4.8, 0.13, 0.04);
    
    // === "Призрачные" гармоники ===
    this.playGhostVoice(1800, now + 1.8, 0.4, 0.02);
    this.playGhostVoice(2200, now + 4.0, 0.5, 0.025);
  }

  /**
   * Проигрывание одного "голоса"
   */
  private playGhostVoice(
    frequency: number,
    startTime: number,
    duration: number,
    volume: number
  ): void {
    if (!this.audioContext) return;
    
    const osc = this.audioContext.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = frequency;
    
    // LFO для модуляции голоса (эффект "дрожания")
    const lfo = this.audioContext.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 5 + Math.random() * 10; // 5-15 Hz
    
    const lfoGain = this.audioContext.createGain();
    lfoGain.gain.value = 3 + Math.random() * 5; // Случайная глубина
    
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    
    const gain = this.audioContext.createGain();
    
    // Плавное появление и исчезновение
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + duration * 0.3);
    gain.gain.setValueAtTime(volume, startTime + duration * 0.7);
    gain.gain.linearRampToValueAtTime(0, startTime + duration);
    
    // Добавляем реверберацию (простой эффект)
    const reverbGain = this.audioContext.createGain();
    reverbGain.gain.value = 0.3;
    
    osc.connect(gain);
    gain.connect(this.audioContext.destination);
    osc.connect(reverbGain);
    reverbGain.connect(this.audioContext.destination);
    
    osc.start(startTime);
    osc.stop(startTime + duration + 0.2);
    
    lfo.start(startTime);
    lfo.stop(startTime + duration + 0.2);
    
    this.voiceOscillators.push(osc, lfo);
    this.voiceGains.push(gain, reverbGain);
  }

  /**
   * Остановка всех звуков
   */
  async stop(): Promise<void> {
    if (!this.isPlaying || !this.audioContext || !this.gainNode) return;
    
    // Плавное затухание (0.2 сек)
    this.gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.2);
    
    // Остановка осцилляторов фильтра
    if (this.filterFreqOsc) {
      try { this.filterFreqOsc.stop(); } catch(e) {}
      this.filterFreqOsc = null;
    }
    if (this.filterQOsc) {
      try { this.filterQOsc.stop(); } catch(e) {}
      this.filterQOsc = null;
    }
    
    // Остановка голосов
    this.voiceOscillators.forEach(osc => {
      try { osc.stop(); } catch(e) {}
    });
    this.voiceOscillators = [];
    this.voiceGains = [];
    
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
      console.log('[SpiritBox] Ghost voices stopped');
    }, 300);
  }

  /**
   * Проверка состояния
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }
}
