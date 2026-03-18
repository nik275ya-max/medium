export const VOICE_OPTIONS = {
  voice1: { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel' },
  voice2: { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi' },
  voice3: { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella' },
};

export class ElevenLabsService {
  private apiKey: string = '';

  setApiKey(key: string): void {
    this.apiKey = key;
  }

  async synthesizeSpeech(text: string, voiceId: string): Promise<ArrayBuffer> {
    if (!this.apiKey) {
      throw new Error('API ключ ElevenLabs не настроен');
    }

    const voice = VOICE_OPTIONS[voiceId as keyof typeof VOICE_OPTIONS];

    if (!voice) {
      throw new Error('Неизвестный голос');
    }

    try {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voice.id}`,
        {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': this.apiKey,
          },
          body: JSON.stringify({
            text: text,
            model_id: 'eleven_monolingual_v1',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.statusText}`);
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

      // Таймаут на случай если аудио не загрузится
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

      // Обработчики событий
      audio.addEventListener('ended', onDone);
      audio.addEventListener('error', onError);
      audio.addEventListener('canplaythrough', () => {
        audio.play().catch((err) => {
          console.error('Play error:', err);
          onError(err);
        });
      });

      // Загружаем аудио
      audio.load();
    });
  }
}
