import { AttachmentInput, DocumentAnalysis } from '../dto/MessageDto';

export interface AiRequest {
  prompt: string;
  systemInstruction: string;
  allowSearch: boolean;
}

export interface AiService { generate(request: AiRequest): Promise<string>; }
export interface DocumentAnalyzer { analyze(attachment: AttachmentInput, correlationId: string): Promise<DocumentAnalysis>; }
export interface ArticleScraper { scrape(url: string): Promise<string>; }
export interface IdGenerator { generate(): string; }
export interface Clock { now(): Date; }
