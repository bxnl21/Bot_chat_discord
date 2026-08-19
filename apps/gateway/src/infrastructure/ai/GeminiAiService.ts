import { GoogleGenAI } from '@google/genai';
import { AiRequest, AiService } from '../../application/ports/Ports';
import { AiQuotaExceededError } from '../../application/errors/AiQuotaExceededError';

export class GeminiAiService implements AiService {
  private readonly client: GoogleGenAI;
  constructor(apiKey: string, private model: string, private fallbackModel: string) { this.client = new GoogleGenAI({ apiKey }); }
  async generate(request: AiRequest): Promise<string> {
    try { return await this.generateWithModel(this.model, request); }
    catch (error) {
      if (!isGeminiQuotaError(error)) throw error;
      console.warn(`Gemini model ${this.model} hết quota, chuyển sang ${this.fallbackModel}`);
      try { return await this.generateWithModel(this.fallbackModel, request); }
      catch (fallbackError) {
        if (isGeminiQuotaError(fallbackError)) throw new AiQuotaExceededError();
        throw fallbackError;
      }
    }
  }

  private async generateWithModel(model: string, request: AiRequest): Promise<string> {
    const response = await this.client.models.generateContent({
      model, contents: request.prompt,
      config: { systemInstruction: request.systemInstruction, ...(request.allowSearch ? { tools: [{ googleSearch: {} }] } : {}) },
    });
    return response.text || '';
  }
}

export function isGeminiQuotaError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const value = error as { status?: number; message?: string };
  return value.status === 429 || /RESOURCE_EXHAUSTED|quota exceeded/i.test(value.message || '');
}
