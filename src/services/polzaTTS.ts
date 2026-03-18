export const VOICE_OPTIONS = {
  voice1: { id: 'alloy', name: 'Alloy' },
  voice2: { id: 'echo', name: 'Echo' },
  voice3: { id: 'fable', name: 'Fable' },
};

export class PolzaTTSService {
  private apiKey: string = '';
  private lastContentType: string = 'audio/mpeg';

  setApiKey(key: string): void {
    this.apiKey = key;
  }

  get lastContentType(): string {
    return this.lastContentType;
  }

  async synthesizeSpeech(text: string, voiceId: string): Promise<ArrayBuffer> {
    if (!this.apiKey) {
      throw new Error('API ключ Polza.ai не настроен');
    }

    const voice = VOICE_OPTIONS[voiceId as keyof typeof VOICE_OPTIONS];

    if (!voice) {
      throw new Error('Неизвестный голос');
    }

    try {
      const response = await fetch(
        'https://api.polza.ai/v1/audio/speech',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model: 'tts-1',
            input: text,
            voice: voice.id,
            response_format: 'mp3',
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Polza TTS API error response:', errorText);
        throw new Error(`Polza TTS API error: ${response.statusText}`);
      }

      // Получаем тип контента из заголовков
      this.lastContentType = response.headers.get('Content-Type') || 'audio/mpeg';
      console.log('Response Content-Type:', this.lastContentType);

      const buffer = await response.arrayBuffer();
      console.log('Received audio buffer size:', buffer.byteLength);
      
      return buffer;
    } catch (error) {
      console.error('Speech synthesis error:', error);
      throw new Error('Ошибка синтеза речи');
    }
  }

  async playAudio(audioBuffer: ArrayBuffer, contentType: string = 'audio/mpeg'): Promise<void> {
    return new Promise((resolve, reject) => {
      const blob = new Blob([audioBuffer], { type: contentType });
      const url = URL.createObjectURL(blob);
      const audio = new Audio();

      const cleanup = () => {
        URL.revokeObjectURL(url);
      };

      audio.onended = () => {
        cleanup();
        resolve();
      };

      audio.onerror = (e) => {
        cleanup();
        console.error('Audio error event:', e);
        reject(new Error('Ошибка воспроизведения аудио'));
      };

      audio.oncanplaythrough = () => {
        console.log('Audio can play through');
        audio.play().catch((err) => {
          cleanup();
          console.error('Audio play error:', err);
          reject(new Error('Ошибка воспроизведения'));
        });
      };

      // Загружаем аудио
      audio.src = url;
      audio.load();
    });
  }
}
