/**
 * SpiritBoxService - Воспроизведение жутких потусторонних звуков
 * Использует готовый аудиофайл
 */

export class SpiritBoxService {
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private audioSource: AudioBufferSourceNode | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private isPlaying: boolean = false;
  private isDucking: boolean = false; // Флаг "приглушения"

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
   * Загрузка аудиофайла
   */
  async loadAudioFile(url: string): Promise<void> {
    this.init();
    if (!this.audioContext) return;
    
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      console.log('[SpiritBox] Audio file loaded:', url);
    } catch (error) {
      console.error('[SpiritBox] Failed to load audio file:', error);
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
    
    // === Если аудиофайл загружен ===
    if (this.audioBuffer) {
      this.audioSource = this.audioContext.createBufferSource();
      this.audioSource.buffer = this.audioBuffer;
      this.audioSource.loop = true;
      
      // === Случайная позиция старта (0-30% от длины) ===
      const randomOffset = this.audioBuffer.duration * Math.random() * 0.3;
      this.audioSource.start(0, randomOffset);
      
      this.audioSource.connect(this.gainNode);
      
      // === Плавное нарастание ===
      this.gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      this.gainNode.gain.linearRampToValueAtTime(0.25, this.audioContext.currentTime + 0.3);
      
      console.log('[SpiritBox] Ghost sounds started (audio file, offset:', randomOffset.toFixed(2) + 's)');
    } else {
      // === Резервный вариант: генерация звуков ===
      console.log('[SpiritBox] No audio file, using fallback');
      this.startFallback();
    }
  }

  /**
   * Резервный вариант (если файл не загружен)
   */
  private startFallback(): void {
    if (!this.audioContext) return;
    
    // === Розовый шум ===
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

    this.audioSource = this.audioContext.createBufferSource();
    this.audioSource.buffer = noiseBuffer;
    this.audioSource.loop = true;

    const bandpassFilter = this.audioContext.createBiquadFilter();
    bandpassFilter.type = 'bandpass';
    bandpassFilter.frequency.value = 600;
    bandpassFilter.Q.value = 2;

    this.audioSource.connect(bandpassFilter);
    if (this.gainNode) {
      bandpassFilter.connect(this.gainNode);
    }
    this.audioSource.start();

    if (this.gainNode) {
      this.gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      this.gainNode.gain.linearRampToValueAtTime(0.2, this.audioContext.currentTime + 0.3);
    }

    console.log('[SpiritBox] Fallback sounds started');
  }

  /**
   * Остановка звуков (полная)
   */
  async stop(): Promise<void> {
    if (!this.isPlaying || !this.audioContext || !this.gainNode) return;
    
    // Плавное затухание (0.3 сек)
    this.gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.3);
    
    // Остановка источника через 0.3 секунды
    setTimeout(() => {
      if (this.audioSource) {
        try { this.audioSource.stop(); } catch(e) {}
        this.audioSource = null;
      }
      if (this.gainNode) {
        this.gainNode.disconnect();
        this.gainNode = null;
      }
      this.isPlaying = false;
      this.isDucking = false;
      console.log('[SpiritBox] Ghost sounds stopped');
    }, 350);
  }

  /**
   * Приглушение звука (ducking) - для воспроизведения ответа
   */
  async duck(): Promise<void> {
    if (!this.isPlaying || !this.gainNode || !this.audioContext) return;
    
    this.isDucking = true;
    
    // Плавно уменьшаем громкость до 8%
    this.gainNode.gain.cancelScheduledValues(this.audioContext.currentTime);
    this.gainNode.gain.linearRampToValueAtTime(0.08, this.audioContext.currentTime + 0.2);
    
    console.log('[SpiritBox] Ghost sounds ducked');
  }

  /**
   * Восстановление громкости после ducking
   */
  async unduck(): Promise<void> {
    if (!this.isPlaying || !this.gainNode || !this.audioContext) return;
    
    this.isDucking = false;
    
    // Плавно восстанавливаем громкость до 25%
    this.gainNode.gain.cancelScheduledValues(this.audioContext.currentTime);
    this.gainNode.gain.linearRampToValueAtTime(0.25, this.audioContext.currentTime + 0.3);
    
    console.log('[SpiritBox] Ghost sounds restored');
  }

  /**
   * Проверка состояния
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }
}
