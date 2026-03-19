export const VOICE_OPTIONS = {
  alloy: { id: 'alloy', name: 'Alloy' },
  echo: { id: 'echo', name: 'Echo' },
  fable: { id: 'fable', name: 'Fable' },
  onyx: { id: 'onyx', name: 'Onyx' },
  nova: { id: 'nova', name: 'Nova' },
  shimmer: { id: 'shimmer', name: 'Shimmer' },
};

export class PolzaTTSService {
  private apiKey: string = '';

  setApiKey(key: string): void {
    this.apiKey = key;
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
      const response = await fetch('https://polza.ai/api/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'openai/tts-1',
          input: text,
          voice: voice.id,
          response_format: 'mp3',
        }),
      });

      if (!response.ok) {
        throw new Error(`Polza TTS API error: ${response.statusText}`);
      }

      return await response.arrayBuffer();
    } catch (error) {
      console.error('Speech synthesis error:', error);
      throw new Error('Ошибка синтеза речи');
    }
  }

  async playAudio(audioBuffer: ArrayBuffer): Promise<void> {
    return new Promise((resolve, reject) => {
      const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.preload = 'auto';

      let resolved = false;

      const finish = (success: boolean, error?: Error) => {
        if (resolved) return;
        resolved = true;
        URL.revokeObjectURL(url);
        if (success) {
          resolve();
        } else {
          reject(error || new Error('Ошибка воспроизведения'));
        }
      };

      const timeout = setTimeout(() => {
        finish(false, new Error('Таймаут воспроизведения'));
      }, 10000);

      const onDone = () => {
        clearTimeout(timeout);
        finish(true);
      };

      const onError = (e: Event) => {
        clearTimeout(timeout);
        console.error('Audio error:', e);
        finish(false, new Error('Ошибка аудио'));
      };

      audio.addEventListener('ended', onDone);
      audio.addEventListener('error', onError);
      audio.addEventListener('canplaythrough', () => {
        audio.play().catch((err) => {
          console.error('Play error:', err);
          onError(err);
        });
      });

      audio.load();
    });
  }
}
