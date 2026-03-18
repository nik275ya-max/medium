import type { Message } from '../types';

export class PolzaAIService {
  private apiKey: string = '';
  private conversationHistory: Message[] = [];

  setApiKey(key: string): void {
    this.apiKey = key;
  }

  initializeWithSystemPrompt(systemPrompt: string): void {
    this.conversationHistory = [
      {
        role: 'system',
        content: systemPrompt,
      },
    ];
  }

  async transcribeAudio(audioBlob: Blob): Promise<string> {
    if (!this.apiKey) {
      throw new Error('API ключ Polza.ai не настроен');
    }

    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('model', 'whisper-1');

    try {
      const response = await fetch('https://api.polza.ai/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Polza API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.text;
    } catch (error) {
      console.error('Transcription error:', error);
      throw new Error('Ошибка распознавания речи');
    }
  }

  async generateResponse(userMessage: string, temperature: number): Promise<string> {
    if (!this.apiKey) {
      throw new Error('API ключ Polza.ai не настроен');
    }

    this.conversationHistory.push({
      role: 'user',
      content: userMessage,
    });

    try {
      const response = await fetch('https://api.polza.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: this.conversationHistory,
          temperature: temperature,
        }),
      });

      if (!response.ok) {
        throw new Error(`Polza API error: ${response.statusText}`);
      }

      const data = await response.json();
      const assistantMessage = data.choices[0]?.message?.content || '';

      this.conversationHistory.push({
        role: 'assistant',
        content: assistantMessage,
      });

      return assistantMessage;
    } catch (error) {
      console.error('Chat completion error:', error);
      throw new Error('Ошибка генерации ответа');
    }
  }

  clearHistory(): void {
    const systemMessage = this.conversationHistory.find((m) => m.role === 'system');
    this.conversationHistory = systemMessage ? [systemMessage] : [];
  }
}
