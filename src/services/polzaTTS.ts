export const VOICE_OPTIONS = {
  voice1: { id: 'alloy', name: 'Alloy' },
  voice2: { id: 'echo', name: 'Echo' },
  voice3: { id: 'fable', name: 'Fable' },
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
          }),
        }
      );

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

      audio.onended = () => {
        URL.revokeObjectURL(url);
        resolve();
      };

      audio.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Ошибка воспроизведения аудио'));
      };

      audio.play();
    });
  }
}
