import { HandleMessageInput } from '../dto/MessageDto';
import { AiService, ArticleScraper, Clock, DocumentAnalyzer, IdGenerator } from '../ports/Ports';
import { ConversationRepository } from '../../domain/repositories/Repositories';
import { InstructionBuilder } from '../services/InstructionBuilder';
import { ActionProcessor } from '../services/ActionProcessor';

export class HandleDiscordMessage {
  constructor(
    private conversations: ConversationRepository,
    private documents: DocumentAnalyzer,
    private scraper: ArticleScraper,
    private ai: AiService,
    private actions: ActionProcessor,
    private instructions: InstructionBuilder,
    private clock: Clock,
    private ids: IdGenerator,
  ) {}

  async execute(input: HandleMessageInput): Promise<string> {
    const correlationId = this.ids.generate();
    const [conversation, analyses] = await Promise.all([
      this.conversations.findByUserId(input.userId),
      Promise.all(input.attachments.map(x => this.documents.analyze(x, correlationId))),
    ]);
    const documents = analyses.map(x =>
      `[TỆP: ${x.fileName}]\n${x.text || '(Worker không trích xuất được văn bản)'}${x.warnings.length ? `\nCảnh báo: ${x.warnings.join('; ')}` : ''}`,
    ).join('\n\n');
    const url = input.prompt.match(/https?:\/\/[^\s]+/)?.[0];
    const summaryIntent = /tóm tắt|summary|review|đọc giúp|xem giúp/i.test(input.prompt);
    const article = url && summaryIntent ? `[NỘI DUNG BÀI VIẾT]\n${(await this.scraper.scrape(url)).slice(0, 15_000)}` : '';
    const prompt = [input.prompt || 'Hãy phân tích và tóm tắt các tệp đính kèm.', documents, article].filter(Boolean).join('\n\n');
    const raw = await this.ai.generate({
      prompt,
      systemInstruction: this.instructions.build(conversation, this.clock.now()),
      allowSearch: input.attachments.length === 0 && shouldUseGoogleSearch(input.prompt),
    });
    if (!raw.trim()) throw new Error('AI không trả về nội dung');
    const response = await this.actions.process(raw, input.userId, input.channelId);
    conversation.add(input.prompt || '[Tệp đính kèm]', response);
    await this.conversations.save(conversation);
    return response;
  }
}

export function shouldUseGoogleSearch(prompt: string): boolean {
  return /\b(tìm kiếm|tra cứu|search|google|mới nhất|gần đây|hôm nay|hiện tại|tin tức|thời tiết|giá (?:vàng|xăng|cổ phiếu|bitcoin)|tỷ giá)\b/i.test(prompt);
}
