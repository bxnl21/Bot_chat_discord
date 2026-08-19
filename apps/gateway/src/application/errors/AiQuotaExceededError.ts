export class AiQuotaExceededError extends Error {
  constructor() {
    super('Gemini API quota exceeded');
    this.name = 'AiQuotaExceededError';
  }
}
