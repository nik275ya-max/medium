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

      const cleanup = () => {
        URL.revokeObjectURL(url);
      };

      audio.onended = () => {
        cleanup();
        resolve();
      };

      audio.onerror = (e) => {
        cleanup();
        console.error('Audio error:', e);
        reject(new Error('Ошибка воспроизведения аудио'));
      };

      audio.oncanplaythrough = () => {
        audio.play().catch((err) => {
          cleanup();
          reject(err);
        });
      };

      // Если аудио уже загружено
      if (audio.readyState >= 3) {
        audio.play().catch((err) => {
          cleanup();
          reject(err);
        });
      }
    });
  }
}
